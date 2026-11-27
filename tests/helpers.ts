import { vi } from "vitest";

export const SESSION_KEY = "a".repeat(64);
export const TOKEN = "test-token-for-local-checks-only-000";
export const DEVICE_ID = "0b3ccce9-6d58-fbc3-52ab-5dae2abb1ff4";
export const ORIGIN = "http://localhost:3000";

export const runningWasher = {
  components: {
    main: {
      "samsungce.washerOperatingState": {
        operatingState: { value: "running" },
        remainingTime: { value: 100, timestamp: "2026-11-06T12:35:00Z" },
        operationTime: { value: 146 },
        progress: { value: 32 },
        washerJobPhase: { value: "drumCleaning" },
      },
    },
  },
};

export function apiRequest(
  path: string,
  { method = "GET", body, cookie, origin = ORIGIN, base = ORIGIN }: {
    method?: "GET" | "POST";
    body?: unknown;
    cookie?: string;
    origin?: string;
    base?: string;
  } = {},
): Request {
  const headers: Record<string, string> = { host: new URL(base).host };

  if (cookie) headers.cookie = cookie;

  if (method === "POST") {
    headers.origin = origin;
    headers["content-type"] = "application/json";
  }

  return new Request(`${base}/api/laundry/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Stubs global fetch with a SmartThings mock and returns the spy. */
export function mockSamsung(handler: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init ?? {}));
  vi.stubGlobal("fetch", spy);

  return spy;
}

/** A well-behaved SmartThings API that returns `status` for /status and ONLINE for /health. */
export function healthySamsung(status: unknown = runningWasher) {
  return mockSamsung((url, init) => {
    if (init.method !== "GET" || init.redirect !== "manual") throw new Error("unexpected request options");

    if ((init.headers as Record<string, string>).Authorization !== `Bearer ${TOKEN}`) throw new Error("wrong token");

    if (!url.startsWith(`https://api.smartthings.com/v1/devices/${DEVICE_ID}/`)) throw new Error(`unexpected url ${url}`);

    return Response.json(url.endsWith("/health") ? { state: "ONLINE" } : status);
  });
}

export const noSamsung = () =>
  mockSamsung(() => {
    throw new Error("must not contact Samsung");
  });

export const cookiePair = (setCookie: string | null) => setCookie!.split(";")[0];
