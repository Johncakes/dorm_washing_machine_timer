/**
 * The /api/laundry contract. Routes build these shapes; the browser client
 * parses every response with them, so both sides agree on one definition.
 */
import { z } from "zod";

export const MACHINE_STATUSES = ["running", "ready", "paused", "unavailable", "unknown", "error", "offline"] as const;
export const MachineStatusSchema = z.enum(MACHINE_STATUSES);

export const API_ERROR_CODES = [
  "BAD_TOKEN",
  "CONTENT_TYPE",
  "ORIGIN_REJECTED",
  "LOCAL_ONLY",
  "SERVER_SETUP",
  "NOT_CONNECTED",
  "TOKEN_EXPIRED",
  "PERMISSION",
  "DEVICE_NOT_FOUND",
  "PLAN_REQUIRED",
  "RATE_LIMIT",
  "UPSTREAM_UNAVAILABLE",
  // Client-side only
  "NETWORK",
  "BAD_RESPONSE",
] as const;

export const ApiErrorSchema = z.object({
  code: z.enum(API_ERROR_CODES),
  message: z.string(),
  /** Seconds to wait before retrying. */
  retryAfter: z.number().optional(),
});

/** Washer state returned by `/status` and `/connect`. */
export const LiveWasherStateSchema = z.object({
  id: z.number(),
  status: MachineStatusSchema,
  /** Minutes left, as reported by the device. Only set while running. */
  remaining: z.number().nullable(),
  /** Total cycle length in minutes. */
  total: z.number().nullable(),
  /** 0–100. */
  progress: z.number().nullable(),
  course: z.string(),
  online: z.boolean(),
  healthKnown: z.boolean(),
  /** When this service last asked Samsung. */
  checkedAt: z.string(),
  /** When Samsung last recorded the device attribute. */
  updatedAt: z.string().nullable(),
  completionTime: z.string().nullable(),
  live: z.literal(true),
});

export const SessionResponseSchema = z.object({
  connected: z.boolean(),
  deviceId: z.string().nullable(),
  pollIntervalMs: z.number(),
});

export const StatusResponseSchema = z.object({
  connected: z.literal(true),
  state: LiveWasherStateSchema,
  pollIntervalMs: z.number(),
});

export const DisconnectResponseSchema = z.object({
  connected: z.literal(false),
});

export const ConnectRequestSchema = z.object({
  token: z.string(),
});

export const DisconnectRequestSchema = z.object({}).strict();
