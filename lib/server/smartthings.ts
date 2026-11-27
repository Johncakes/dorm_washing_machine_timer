import "server-only";
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

/** Backoff in seconds from Retry-After or SmartThings' x-ratelimit-reset (ms), clamped to 10–300. */
function retrySeconds(response: Response): number {
  const seconds = Number(response.headers.get("retry-after"));
  const resetMs = Number(response.headers.get("x-ratelimit-reset"));
  const wait = seconds > 0 ? seconds : resetMs > 0 ? Math.ceil(resetMs / 1000) : 30;

  return Math.max(10, Math.min(300, wait));
}

async function samsungGet(path: "/status" | "/health", token: string): Promise<unknown> {
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

  try {
    return await response.json();
  } catch {
    throw new UpstreamError(502);
  }
}

// Minimal shape of the SmartThings capability attributes we read.
interface Attribute<T = unknown> {
  value?: T | null;
  timestamp?: string;
}

type Capability = Record<string, Attribute | undefined>;

interface DeviceStatus {
  components?: { main?: Record<string, Capability | undefined> };
}

interface DeviceHealth {
  state?: string;
}

const MODERN_STATES: Record<string, MachineStatus> = { running: "running", paused: "paused", ready: "ready" };
const LEGACY_STATES: Record<string, MachineStatus> = { run: "running", pause: "paused", stop: "ready", idle: "ready" };

const COURSE_NAMES: Record<string, string> = {
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
};

const FALLBACK_COURSE: Partial<Record<MachineStatus, string>> = {
  running: "세탁 중",
  paused: "일시정지",
  ready: "작동하지 않음",
};

const finite = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);

  return Number.isFinite(n) ? n : null;
};

/**
 * Converts raw SmartThings washer status into the dashboard's shape.
 * Missing or unreliable values become `null`; they are never guessed.
 */
export function normalizeStatus(
  raw: unknown,
  health: unknown,
  checkedAt = new Date().toISOString(),
): LiveWasherState {
  const main = (raw as DeviceStatus | null)?.components?.main ?? {};
  const modern = main["samsungce.washerOperatingState"] ?? {};
  const standard = main.washerOperatingState ?? {};
  const healthState = (health as DeviceHealth | null)?.state;

  const online = healthState !== "OFFLINE";
  const op = String(modern.operatingState?.value ?? "");
  const legacy = String(standard.machineState?.value ?? "");
  const status: MachineStatus = !online ? "offline" : MODERN_STATES[op] ?? LEGACY_STATES[legacy] ?? "unavailable";

  const remainingValue = finite(modern.remainingTime?.value);
  const remaining = status === "running" && remainingValue !== null && remainingValue >= 0 ? Math.round(remainingValue) : null;
  const progressValue = finite(modern.progress?.value);
  const duration = finite(modern.operationTime?.value);

  const phase = String(
    modern.washerJobPhase?.value ?? modern.washerJobState?.value ?? standard.washerJobState?.value ?? "",
  );

  return {
    id: LIVE_WASHER_ID,
    status,
    remaining,
    total: duration !== null && duration > 0 ? duration : null,
    progress: progressValue === null ? null : Math.min(100, Math.max(0, progressValue)),
    course: COURSE_NAMES[phase] ?? FALLBACK_COURSE[status] ?? "상태 확인 필요",
    online,
    healthKnown: typeof healthState === "string",
    checkedAt,
    updatedAt:
      modern.remainingTime?.timestamp ?? modern.operatingState?.timestamp ?? standard.machineState?.timestamp ?? null,
    completionTime: (standard.completionTime?.value as string | undefined) ?? null,
    live: true,
  };
}

/** Reads washer 5. Health is optional: if it fails, the device is assumed online. */
export async function readWasherStatus(token: string): Promise<LiveWasherState> {
  const [raw, health] = await Promise.all([
    samsungGet("/status", token),
    samsungGet("/health", token).catch(() => null),
  ]);

  return normalizeStatus(raw, health);
}
