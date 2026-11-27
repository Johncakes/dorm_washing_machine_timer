/** Types shared by the API routes and the dashboard UI. API types are derived from `schemas.ts`. */
import type { z } from "zod";
import type {
  ApiErrorSchema,
  ConnectRequestSchema,
  DisconnectRequestSchema,
  DisconnectResponseSchema,
  LiveWasherStateSchema,
  MachineStatusSchema,
  SessionResponseSchema,
  StatusResponseSchema,
} from "./schemas";

export type MachineKind = "washer" | "dryer";

export type MachineStatus = z.infer<typeof MachineStatusSchema>;

/** A machine as the dashboard draws it: demo data, an unconnected slot, or the live washer. */
export interface Machine {
  id: number;
  status: MachineStatus;
  /** Minutes left, as reported by the device. Only set while running. */
  remaining?: number | null;
  /** Total cycle length in minutes, if the device reports it. */
  total?: number | null;
  /** 0–100. */
  progress?: number | null;
  course?: string;
  /** True when the value came from SmartThings rather than demo data. */
  live?: boolean;
  /** When this service last asked Samsung. */
  checkedAt?: string;
  /** When Samsung last recorded the device attribute. */
  updatedAt?: string | null;
}

export type LiveWasherState = z.infer<typeof LiveWasherStateSchema>;

export type ApiError = z.infer<typeof ApiErrorSchema>;

export type ApiErrorCode = ApiError["code"];

export type SessionResponse = z.infer<typeof SessionResponseSchema>;

export type StatusResponse = z.infer<typeof StatusResponseSchema>;

export type DisconnectResponse = z.infer<typeof DisconnectResponseSchema>;

export type ConnectRequest = z.infer<typeof ConnectRequestSchema>;

export type DisconnectRequest = z.infer<typeof DisconnectRequestSchema>;

/** The only washer currently registered in SmartThings. */
export const LIVE_WASHER_ID = 5;
export const POLL_INTERVAL_MS = 10_000;
