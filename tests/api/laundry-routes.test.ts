import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST as connect } from "@/app/api/laundry/connect/route";
import { POST as disconnect } from "@/app/api/laundry/disconnect/route";
import { GET as session } from "@/app/api/laundry/session/route";
import { GET as status } from "@/app/api/laundry/status/route";
import { LOCAL_USER } from "@/lib/server/guard";
import { sealSession } from "@/lib/server/session";
import { clearStatusCache } from "@/lib/server/status-cache";
import { DEVICE_ID, SESSION_KEY, TOKEN, apiRequest, cookiePair, healthySamsung, mockSamsung, noSamsung, runningWasher } from "../helpers";

const sealedCookie = async () =>
  `laundry-session=${await sealSession(
    { id: crypto.randomUUID(), userId: LOCAL_USER, token: TOKEN, deviceId: DEVICE_ID, expiresAt: Date.now() + 60_000 },
    SESSION_KEY,
  )}`;

beforeEach(() => {
  vi.stubEnv("LAUNDRY_SESSION_KEY", SESSION_KEY);
  clearStatusCache();
});

describe("request guard", () => {
  it("rejects cross-origin mutations, bad tokens and foreign hosts before contacting Samsung", async () => {
    const fetch = noSamsung();
    expect((await connect(apiRequest("connect", { method: "POST", body: { token: TOKEN }, origin: "http://evil.test" }))).status).toBe(403);
    expect((await connect(apiRequest("connect", { method: "POST", body: { token: "bad" } }))).status).toBe(400);
    expect((await session(apiRequest("session", { base: "http://evil.test" }))).status).toBe(403);

    const noJson = new Request("http://localhost:3000/api/laundry/connect", {
      method: "POST", headers: { host: "localhost:3000", origin: "http://localhost:3000", "content-type": "text/plain" }, body: "{}",
    });

    expect((await connect(noJson)).status).toBe(415);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports SERVER_SETUP for an invalid session key", async () => {
    vi.stubEnv("LAUNDRY_SESSION_KEY", "not-a-key");
    const response = await session(apiRequest("session"));
    expect(response.status).toBe(503);
    expect((await response.json()).code).toBe("SERVER_SETUP");
  });
});

describe("connect → status → disconnect", () => {
  it("stores the token only in an encrypted HttpOnly cookie", async () => {
    healthySamsung();
    const response = await connect(apiRequest("connect", { method: "POST", body: { token: `Bearer ${TOKEN}` } }));
    expect(response.status).toBe(200);
    const setCookie = response.headers.get("set-cookie")!;
    expect(setCookie).toMatch(/^laundry-session=.+; Path=\/; HttpOnly; SameSite=Strict; Max-Age=86400$/);
    expect(setCookie).not.toContain(TOKEN);
    const text = await response.text();
    expect(text).not.toContain(TOKEN);
    expect(JSON.parse(text).state.remaining).toBe(100);

    const cookie = cookiePair(setCookie);
    expect(await (await session(apiRequest("session", { cookie }))).json()).toMatchObject({ connected: true, deviceId: DEVICE_ID });
    expect((await (await status(apiRequest("status", { cookie }))).json()).state.remaining).toBe(100);

    const out = await disconnect(apiRequest("disconnect", { method: "POST", body: {}, cookie }));
    expect(out.status).toBe(200);
    expect(out.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("uses the __Host- Secure cookie over https", async () => {
    healthySamsung();
    const base = "https://localhost:3000";
    const response = await connect(apiRequest("connect", { method: "POST", body: { token: TOKEN }, base, origin: base }));
    expect(response.headers.get("set-cookie")).toMatch(/^__Host-laundry-session=.+; Secure;/);
  });

  it("returns fresh upstream values and reuses them within the cache window", async () => {
    const cookie = await sealedCookie();
    let remaining = 96;

    const fetch = mockSamsung((url) =>
      Response.json(url.endsWith("/health") ? { state: "ONLINE" } : {
        components: { main: { "samsungce.washerOperatingState": { ...runningWasher.components.main["samsungce.washerOperatingState"], remainingTime: { value: remaining } } } },
      }),
    );

    expect((await (await status(apiRequest("status", { cookie }))).json()).state.remaining).toBe(96);
    remaining = 90;
    const [a, b] = await Promise.all([status(apiRequest("status", { cookie })), status(apiRequest("status", { cookie }))]);
    expect((await a.json()).state.remaining).toBe(96);
    expect((await b.json()).state.remaining).toBe(96);
    expect(fetch).toHaveBeenCalledTimes(2); // one /status + one /health
  });

  it("requires a session for status", async () => {
    noSamsung();
    const response = await status(apiRequest("status"));
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("NOT_CONNECTED");
  });

  it("disconnect works without a session and never contacts Samsung", async () => {
    const fetch = noSamsung();
    const response = await disconnect(apiRequest("disconnect", { method: "POST", body: {} }));
    expect(response.status).toBe(200);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("upstream failures", () => {
  it("clears the cookie on token expiry and returns a backoff on rate limit", async () => {
    mockSamsung(() => new Response("expired", { status: 401 }));
    const expired = await status(apiRequest("status", { cookie: await sealedCookie() }));
    expect(expired.status).toBe(401);
    expect(expired.headers.get("set-cookie")).toContain("Max-Age=0");

    mockSamsung(() => new Response("slow down", { status: 429, headers: { "retry-after": "40" } }));
    const limited = await status(apiRequest("status", { cookie: await sealedCookie() }));
    expect(limited.status).toBe(429);
    expect((await limited.json()).retryAfter).toBe(40);
    expect(limited.headers.get("retry-after")).toBe("40");
  });

  it("uses x-ratelimit-reset and clamps the backoff", async () => {
    mockSamsung(() => new Response("", { status: 429, headers: { "x-ratelimit-reset": "2500" } }));
    const response = await status(apiRequest("status", { cookie: await sealedCookie() }));
    expect((await response.json()).retryAfter).toBe(10);
  });

  it("rejects redirects without following them or saving a session", async () => {
    const fetch = mockSamsung(() => new Response(null, { status: 302, headers: { Location: "https://untrusted.example/" } }));
    const response = await connect(apiRequest("connect", { method: "POST", body: { token: TOKEN } }));
    expect(response.status).toBe(503);
    expect(response.headers.get("set-cookie")).toBeNull();

    for (const [url] of fetch.mock.calls) expect(String(url)).toMatch(/^https:\/\/api\.smartthings\.com\//);
  });

  it("does not leak upstream error bodies", async () => {
    mockSamsung(() => new Response("secret upstream detail", { status: 500 }));
    const response = await status(apiRequest("status", { cookie: await sealedCookie() }));
    expect(await response.text()).not.toContain("secret upstream detail");
  });
});
