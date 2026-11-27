/** Types shared by the API routes and the dashboard UI. */

export type MachineKind = "washer" | "dryer";

export type MachineStatus =
  | "running"
  | "ready"
  | "paused"
  | "unavailable"
  | "unknown"
  | "error"
  | "offline";

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

/** Washer state returned by `/api/laundry/status` and `/api/laundry/connect`. */
export interface LiveWasherState extends Machine {
  live: true;
  online: boolean;
  healthKnown: boolean;
  checkedAt: string;
  updatedAt: string | null;
  completionTime: string | null;
}

export type ApiErrorCode =
  | "BAD_TOKEN"
  | "CONTENT_TYPE"
  | "ORIGIN_REJECTED"
  | "LOCAL_ONLY"
  | "SERVER_SETUP"
  | "NOT_CONNECTED"
  | "TOKEN_EXPIRED"
  | "PERMISSION"
  | "DEVICE_NOT_FOUND"
  | "PLAN_REQUIRED"
  | "RATE_LIMIT"
  | "UPSTREAM_UNAVAILABLE"
  // Client-side only
  | "NETWORK"
  | "BAD_RESPONSE";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** Seconds to wait before retrying. */
  retryAfter?: number;
}

export interface SessionResponse {
  connected: boolean;
  deviceId: string | null;
  pollIntervalMs: number;
}

export interface StatusResponse {
  connected: true;
  state: LiveWasherState;
  pollIntervalMs: number;
}

export interface DisconnectResponse {
  connected: false;
}

/** The only washer currently registered in SmartThings. */
export const LIVE_WASHER_ID = 5;
export const POLL_INTERVAL_MS = 10_000;
