import "server-only";
import type { LiveWasherState } from "@/lib/laundry/types";

/** How long one SmartThings read is reused for a session. */
export const CACHE_TTL_MS = 8_000;
const MAX_ENTRIES = 100;

type Entry = { state: LiveWasherState; until: number } | { pending: Promise<LiveWasherState>; until: 0 };

// Next.js bundles each route separately, so module-level state isn't guaranteed to be
// shared between routes. Keep the cache on globalThis so connect/status/disconnect see one map.
const store = globalThis as typeof globalThis & { __laundryStatusCache?: Map<string, Entry> };
const cache = (store.__laundryStatusCache ??= new Map());

function prune(now: number) {
  if (cache.size <= MAX_ENTRIES) return;

  for (const [id, entry] of cache) if ("state" in entry && entry.until < now) cache.delete(id);
}

export function rememberStatus(sessionId: string, state: LiveWasherState) {
  cache.set(sessionId, { state, until: Date.now() + CACHE_TTL_MS });
}

export function forgetStatus(sessionId: string) {
  cache.delete(sessionId);
}

/**
 * Returns the cached state if it is fresh. Otherwise calls `read`, sharing a single
 * in-flight request between concurrent callers. Failures are not cached.
 */
export async function cachedStatus(sessionId: string, read: () => Promise<LiveWasherState>): Promise<LiveWasherState> {
  const now = Date.now();
  prune(now);
  const entry = cache.get(sessionId);

  if (entry && "state" in entry && entry.until >= now) return entry.state;

  if (entry && "pending" in entry) return entry.pending;

  const pending = read();
  cache.set(sessionId, { pending, until: 0 });

  try {
    const state = await pending;
    rememberStatus(sessionId, state);

    return state;
  } catch (error) {
    forgetStatus(sessionId);
    throw error;
  }
}

/** Test helper. */
export function clearStatusCache() {
  cache.clear();
}
