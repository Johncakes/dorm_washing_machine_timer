import { POLL_INTERVAL_MS, type SessionResponse } from "@/lib/laundry/types";
import { guard } from "@/lib/server/guard";
import { json } from "@/lib/server/responses";
import { loadSession } from "@/lib/server/session";
import { DEVICE_ID } from "@/lib/server/smartthings";

/** Reports whether this browser has a valid connection. Never contacts Samsung. */
export async function GET(request: Request) {
  const ctx = guard(request);
  if (ctx instanceof Response) return ctx;

  const session = await loadSession(request, ctx);
  return json<SessionResponse>({
    connected: !!session,
    deviceId: session ? DEVICE_ID : null,
    pollIntervalMs: POLL_INTERVAL_MS,
  });
}
