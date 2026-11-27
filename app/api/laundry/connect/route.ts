import { POLL_INTERVAL_MS, type StatusResponse } from "@/lib/laundry/types";
import { guard } from "@/lib/server/guard";
import { apiError, json, upstreamErrorResponse } from "@/lib/server/responses";
import { SESSION_MAX_AGE_SECONDS, sealSession, sessionCookie } from "@/lib/server/session";
import { DEVICE_ID, readWasherStatus } from "@/lib/server/smartthings";
import { rememberStatus } from "@/lib/server/status-cache";

const MAX_BODY_LENGTH = 4096;
const TOKEN_PATTERN = /^[A-Za-z0-9._~-]{20,2048}$/;

async function readToken(request: Request): Promise<string | null> {
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_LENGTH) return null;
    const body = JSON.parse(text) as { token?: unknown };
    const token = String(body.token ?? "").trim().replace(/^Bearer\s+/i, "");
    return TOKEN_PATTERN.test(token) ? token : null;
  } catch {
    return null;
  }
}

/** Verifies a SmartThings PAT against washer 5 and stores it in an encrypted cookie. */
export async function POST(request: Request) {
  const ctx = guard(request, { mutation: true });
  if (ctx instanceof Response) return ctx;

  const token = await readToken(request);
  if (!token) return apiError("BAD_TOKEN", "발급받은 토큰 문자열을 확인해 주세요.", 400);

  try {
    const state = await readWasherStatus(token);
    const session = {
      id: crypto.randomUUID(),
      userId: ctx.userId,
      token,
      deviceId: DEVICE_ID,
      expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
    };
    const cookie = sessionCookie(await sealSession(session, ctx.sessionKey), ctx.secure);
    rememberStatus(session.id, state);
    return json<StatusResponse>({ connected: true, state, pollIntervalMs: POLL_INTERVAL_MS }, 200, {
      "Set-Cookie": cookie,
    });
  } catch (error) {
    return upstreamErrorResponse(error, ctx.secure);
  }
}
