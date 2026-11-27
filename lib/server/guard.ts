import "server-only";
import { randomBytes } from "node:crypto";
import { apiError } from "./responses";
import { isValidSessionKey } from "./session";

/**
 * This app runs on the owner's own machine with no login, so every request is the
 * same local user. Sessions are still bound to it so the check stays in place if
 * real authentication is added later.
 */
export const LOCAL_USER = "local-owner";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export interface RequestContext {
  secure: boolean;
  sessionKey: string;
  userId: string;
}

const keyStore = globalThis as typeof globalThis & { __laundryTempKey?: string };

/** LAUNDRY_SESSION_KEY from .env.local, or a per-process temporary key if it is unset. */
function sessionKey(): string | null {
  const configured = process.env.LAUNDRY_SESSION_KEY;

  if (configured) return isValidSessionKey(configured) ? configured : null;

  if (!keyStore.__laundryTempKey) {
    console.warn(
      "[laundry] LAUNDRY_SESSION_KEY is not set. Using a temporary key; you will need to reconnect after every restart. Run `npm run gen-key >> .env.local` to keep sessions.",
    );
    keyStore.__laundryTempKey = randomBytes(32).toString("hex");
  }

  return keyStore.__laundryTempKey;
}

function isLocalHost(request: Request): boolean {
  const host = (request.headers.get("host") ?? new URL(request.url).host).toLowerCase();

  return LOCAL_HOSTS.has(host.replace(/:\d+$/, ""));
}

/**
 * Shared checks for every /api/laundry route. Returns an error Response to send
 * as-is, or the context the route needs.
 *
 * - Host must be localhost: blocks DNS-rebinding pages even if the server is exposed.
 * - Mutations must be same-origin JSON: blocks cross-site form posts.
 */
export function guard(request: Request, { mutation = false } = {}): Response | RequestContext {
  if (!isLocalHost(request)) return apiError("LOCAL_ONLY", "이 서버는 이 컴퓨터에서만 사용할 수 있어요.", 403);

  const key = sessionKey();

  if (!key) return apiError("SERVER_SETUP", "서버 연결 설정이 준비되지 않았어요. LAUNDRY_SESSION_KEY 값을 확인해 주세요.", 503);

  const url = new URL(request.url);

  if (mutation) {
    if (request.headers.get("origin") !== url.origin)
      return apiError("ORIGIN_REJECTED", "사이트에서 직접 연결해 주세요.", 403);

    if (!request.headers.get("content-type")?.startsWith("application/json"))
      return apiError("CONTENT_TYPE", "올바르지 않은 요청이에요.", 415);
  }

  return { secure: url.protocol === "https:", sessionKey: key, userId: LOCAL_USER };
}
