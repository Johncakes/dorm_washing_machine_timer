import { describe, expect, it } from "vitest";
import { openSession, sealSession, sessionCookie, clearedSessionCookie, readSessionCookie } from "@/lib/server/session";
import { DEVICE_ID, SESSION_KEY, TOKEN } from "../helpers";

const session = () => ({ id: crypto.randomUUID(), userId: "owner", token: TOKEN, deviceId: DEVICE_ID, expiresAt: Date.now() + 60_000 });

describe("session encryption", () => {
  it("round-trips and never contains the token in plain text", async () => {
    const value = await sealSession(session(), SESSION_KEY);
    expect(value).not.toContain(TOKEN);
    expect((await openSession(value, SESSION_KEY, "owner"))?.token).toBe(TOKEN);
  });

  it("rejects another user, another key, expired sessions, and tampering", async () => {
    const value = await sealSession(session(), SESSION_KEY);
    expect(await openSession(value, SESSION_KEY, "someone-else")).toBeNull();
    expect(await openSession(value, "b".repeat(64), "owner")).toBeNull();
    expect(await openSession(value, SESSION_KEY, "owner", Date.now() + 25 * 3_600_000)).toBeNull();
    expect(await openSession(value.slice(0, -2) + "AA", SESSION_KEY, "owner")).toBeNull();
    expect(await openSession(undefined, SESSION_KEY, "owner")).toBeNull();
  });

  it("rejects sessions for a different device", async () => {
    const value = await sealSession({ ...session(), deviceId: "other" }, SESSION_KEY);
    expect(await openSession(value, SESSION_KEY, "owner")).toBeNull();
  });
});

describe("session cookie", () => {
  it("uses __Host- and Secure over https only", () => {
    expect(sessionCookie("v", true)).toMatch(/^__Host-laundry-session=v; Path=\/; HttpOnly; Secure; SameSite=Strict; Max-Age=86400$/);
    expect(sessionCookie("v", false)).toMatch(/^laundry-session=v; Path=\/; HttpOnly; SameSite=Strict; Max-Age=86400$/);
    expect(clearedSessionCookie(false)).toContain("Max-Age=0");
  });

  it("reads only the cookie matching the protocol", () => {
    const request = new Request("http://localhost/", { headers: { cookie: "a=1; laundry-session=plain; __Host-laundry-session=secure" } });
    expect(readSessionCookie(request, false)).toBe("plain");
    expect(readSessionCookie(request, true)).toBe("secure");
  });
});
