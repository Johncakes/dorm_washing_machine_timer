import { describe, expect, it } from "vitest";
import { normalizeStatus } from "@/lib/server/smartthings";
import { runningWasher } from "../helpers";

const withModern = (patch: Record<string, unknown>) => {
  const raw = structuredClone(runningWasher) as { components: { main: Record<string, Record<string, unknown>> } };
  Object.assign(raw.components.main["samsungce.washerOperatingState"], patch);

  return raw;
};

describe("normalizeStatus", () => {
  it("reports real values from a running washer", () => {
    const state = normalizeStatus(runningWasher, { state: "ONLINE" }, "2026-11-06T12:36:00Z");
    expect(state).toMatchObject({
      id: 5, status: "running", remaining: 100, total: 146, progress: 32, course: "무세제 통세척",
      online: true, healthKnown: true, updatedAt: "2026-11-06T12:35:00Z", checkedAt: "2026-11-06T12:36:00Z", live: true,
    });
  });

  it("does not show remaining time when offline, paused, or missing", () => {
    expect(normalizeStatus(runningWasher, { state: "OFFLINE" })).toMatchObject({ status: "offline", remaining: null });

    const paused = withModern({ operatingState: { value: "paused" } });
    (paused.components.main as Record<string, unknown>).washerOperatingState = { machineState: { value: "run" } };
    expect(normalizeStatus(paused, null)).toMatchObject({ status: "paused", remaining: null });

    const missing = withModern({ remainingTime: undefined });
    expect(normalizeStatus(missing, null).remaining).toBeNull();

    expect(normalizeStatus(withModern({ remainingTime: { value: null } }), null).remaining).toBeNull();
    expect(normalizeStatus(withModern({ remainingTime: { value: -1 } }), null).remaining).toBeNull();
  });

  it("falls back to the legacy capability and to unavailable", () => {
    const legacy = { components: { main: { washerOperatingState: { machineState: { value: "stop" } } } } };
    expect(normalizeStatus(legacy, null)).toMatchObject({ status: "ready", course: "작동하지 않음", healthKnown: false });
    expect(normalizeStatus({}, null)).toMatchObject({ status: "unavailable", course: "상태 확인 필요" });
    expect(normalizeStatus(null, null).status).toBe("unavailable");
  });

  it("clamps progress and ignores non-positive durations", () => {
    const state = normalizeStatus(withModern({ progress: { value: 140 }, operationTime: { value: 0 } }), null);
    expect(state.progress).toBe(100);
    expect(state.total).toBeNull();
  });
});
