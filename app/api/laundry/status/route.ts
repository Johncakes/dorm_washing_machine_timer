import { POLL_INTERVAL_MS, type StatusResponse } from "@/lib/laundry/types";
import { guard } from "@/lib/server/guard";
import { apiError, json, upstreamErrorResponse } from "@/lib/server/responses";
import { clearedSessionCookie, loadSession } from "@/lib/server/session";
import { UpstreamError, readWasherStatus } from "@/lib/server/smartthings";
import { cachedStatus } from "@/lib/server/status-cache";

/** Current washer 5 state. Reads Samsung at most once per cache window per session. */
export async function GET(request: Request) {
  const ctx = guard(request);

  if (ctx instanceof Response) return ctx;

  const session = await loadSession(request, ctx);

  if (!session) {
    return apiError("NOT_CONNECTED", "SmartThings 연결에서 토큰을 입력해 주세요.", 401, {
      headers: { "Set-Cookie": clearedSessionCookie(ctx.secure) },
    });
  }

  try {
    const state = await cachedStatus(session.id, () => readWasherStatus(session.token));

    return json<StatusResponse>({ connected: true, state, pollIntervalMs: POLL_INTERVAL_MS });
  } catch (error) {
    return upstreamErrorResponse(error instanceof UpstreamError ? error : new UpstreamError(503), ctx.secure);
  }
}
