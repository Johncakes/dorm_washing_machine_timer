import "server-only";
import { z } from "zod";
import { LIVE_WASHER_ID, type LiveWasherState, type MachineStatus } from "@/lib/laundry/types";

/** SmartThings device ID of washer 5. */
export const DEVICE_ID = "0b3ccce9-6d58-fbc3-52ab-5dae2abb1ff4";
const API_BASE = "https://api.smartthings.com/v1/devices";
const TIMEOUT_MS = 8_000;

/** A failed SmartThings request, carrying the HTTP status to map to a user-facing error. */
export class UpstreamError extends Error {
  constructor(
    readonly status: number,
    readonly retryAfter = 30,
  ) {
    super(`SmartThings request failed (${status})`);
    this.name = "UpstreamError";
  }
}

// --- Response schemas -------------------------------------------------------
// Lenient on purpose: a missing or malformed attribute becomes null/undefined
// instead of failing the whole reading, and is then shown as unknown, never guessed.

const MODERN_STATES = ["running", "paused", "ready"] as const;
const LEGACY_STATES = ["run", "pause", "stop", "idle"] as const;

const JOB_PHASES = [
  "drumCleaning",
  "wash",
  "washing",
  "rinse",
  "rinsing",
  "spin",
  "spinning",
  "finish",
  "finished",
  "none",
] as const;

/** One capability attribute `{ value, timestamp }` whose value must match `value`. */
const attribute = <V extends z.ZodType>(value: V) =>
  z
    .object({
      value: value.nullish().catch(null),
      timestamp: z.string().optional().catch(undefined),
    })
    .optional()
    .catch(undefined);

const ModernCapabilitySchema = z
  .object({
    operatingState: attribute(z.enum(MODERN_STATES)),
    remainingTime: attribute(z.number()),
    operationTime: attribute(z.number()),
    progress: attribute(z.number()),
    washerJobPhase: attribute(z.enum(JOB_PHASES)),
    washerJobState: attribute(z.enum(JOB_PHASES)),
  })
  .optional()
  .catch(undefined);

const LegacyCapabilitySchema = z
  .object({
    machineState: attribute(z.enum(LEGACY_STATES)),
    washerJobState: attribute(z.enum(JOB_PHASES)),
    completionTime: attribute(z.string()),
  })
  .optional()
  .catch(undefined);

/** `GET /devices/{id}/status`. Anything unexpected parses to an empty reading. */
export const DeviceStatusSchema = z
  .object({
    components: z
      .object({
        main: z
          .object({
            "samsungce.washerOperatingState": ModernCapabilitySchema,
            washerOperatingState: LegacyCapabilitySchema,
          })
          .optional()
          .catch(undefined),
      })
      .optional()
      .catch(undefined),
  })
  .catch({});

/** `GET /devices/{id}/health`. */
export const DeviceHealthSchema = z.object({ state: z.string().optional().catch(undefined) }).catch({});

export type DeviceStatus = z.infer<typeof DeviceStatusSchema>;

export type DeviceHealth = z.infer<typeof DeviceHealthSchema>;

// --- Mapping ----------------------------------------------------------------

const FROM_MODERN = {
  running: "running",
  paused: "paused",
  ready: "ready",
} as const satisfies Record<(typeof MODERN_STATES)[number], MachineStatus>;

const FROM_LEGACY = {
  run: "running",
  pause: "paused",
  stop: "ready",
  idle: "ready",
} as const satisfies Record<(typeof LEGACY_STATES)[number], MachineStatus>;

const COURSE_NAMES = {
  drumCleaning: "무세제 통세척",
  wash: "세탁",
  washing: "세탁",
  rinse: "헹굼",
  rinsing: "헹굼",
  spin: "탈수",
  spinning: "탈수",
  finish: "완료",
  finished: "완료",
  none: "대기",
} as const satisfies Record<(typeof JOB_PHASES)[number], string>;

function fallbackCourse(status: MachineStatus): string {
  switch (status) {
    case "running":
      return "세탁 중";
    case "paused":
      return "일시정지";
    case "ready":
      return "작동하지 않음";
    default:
      return "상태 확인 필요";
  }
}

/** Backoff in seconds from Retry-After or SmartThings' x-ratelimit-reset (ms), clamped to 10–300. */
function retrySeconds(response: Response): number {
  const seconds = Number(response.headers.get("retry-after"));
  const resetMs = Number(response.headers.get("x-ratelimit-reset"));
  const wait = seconds > 0 ? seconds : resetMs > 0 ? Math.ceil(resetMs / 1000) : 30;

  return Math.max(10, Math.min(300, wait));
}

/**
 * Converts a parsed SmartThings washer status into the dashboard's shape.
 * Missing or unreliable values become `null`; they are never guessed.
 */
export function normalizeStatus(
  device: DeviceStatus,
  health: DeviceHealth | null,
  checkedAt = new Date().toISOString(),
): LiveWasherState {
  const main = device.components?.main;
  const modern = main?.["samsungce.washerOperatingState"];
  const legacy = main?.washerOperatingState;
  const healthState = health?.state;

  const online = healthState !== "OFFLINE";
  const modernState = modern?.operatingState?.value;
  const legacyState = legacy?.machineState?.value;

  const status: MachineStatus = !online
    ? "offline"
    : modernState
      ? FROM_MODERN[modernState]
      : legacyState
        ? FROM_LEGACY[legacyState]
        : "unavailable";

  const remainingValue = modern?.remainingTime?.value;
  const remaining = status === "running" && remainingValue != null && remainingValue >= 0 ? Math.round(remainingValue) : null;
  const progress = modern?.progress?.value;
  const duration = modern?.operationTime?.value;
  const phase = modern?.washerJobPhase?.value ?? modern?.washerJobState?.value ?? legacy?.washerJobState?.value;

  return {
    id: LIVE_WASHER_ID,
    status,
    remaining,
    total: duration != null && duration > 0 ? duration : null,
    progress: progress == null ? null : Math.min(100, Math.max(0, progress)),
    course: phase ? COURSE_NAMES[phase] : fallbackCourse(status),
    online,
    healthKnown: healthState !== undefined,
    checkedAt,
    updatedAt: modern?.remainingTime?.timestamp ?? modern?.operatingState?.timestamp ?? legacy?.machineState?.timestamp ?? null,
    completionTime: legacy?.completionTime?.value ?? null,
    live: true,
  };
}

// --- HTTP -------------------------------------------------------------------

/** GETs a device endpoint and parses it with `schema`. Unparseable bodies are a 502. */
async function samsungGet<S extends z.ZodType>(path: "/status" | "/health", token: string, schema: S): Promise<z.infer<S>> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE}/${DEVICE_ID}${path}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      // Never forward a device credential to a redirect destination.
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    throw new UpstreamError(503);
  }

  if (response.status >= 300 && response.status < 400) throw new UpstreamError(502);

  if (!response.ok) throw new UpstreamError(response.status, retrySeconds(response));

  const json = await response.json().catch(() => {
    throw new UpstreamError(502);
  });

  const parsed = schema.safeParse(json);

  if (!parsed.success) throw new UpstreamError(502);

  return parsed.data;
}

/** Reads washer 5. Health is optional: if it fails, the device is assumed online. */
export async function readWasherStatus(token: string): Promise<LiveWasherState> {
  const [device, health] = await Promise.all([
    samsungGet("/status", token, DeviceStatusSchema),
    samsungGet("/health", token, DeviceHealthSchema).catch(() => null),
  ]);

  return normalizeStatus(device, health);
}
