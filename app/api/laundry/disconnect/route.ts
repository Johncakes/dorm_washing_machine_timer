import type { DisconnectResponse } from "@/lib/laundry/types";
import { guard } from "@/lib/server/guard";
import { json } from "@/lib/server/responses";
import { clearedSessionCookie, loadSession } from "@/lib/server/session";
import { forgetStatus } from "@/lib/server/status-cache";

/** Clears this browser's session. Does not touch the Samsung device registration. */
export async function POST(request: Request) {
  const ctx = guard(request, { mutation: true });

  if (ctx instanceof Response) return ctx;

  const session = await loadSession(request, ctx);

  if (session) forgetStatus(session.id);

  return json<DisconnectResponse>({ connected: false }, 200, { "Set-Cookie": clearedSessionCookie(ctx.secure) });
}
