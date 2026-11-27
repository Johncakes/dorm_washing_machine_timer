import { describe, expect, it } from "vitest";
import { DeviceHealthSchema, DeviceStatusSchema, normalizeStatus } from "@/lib/server/smartthings";
import { type RawAttribute, type RawWasherStatus, runningWasher } from "../helpers";

/** Parses raw JSON the same way `readWasherStatus` does, then normalizes it. */
const read = (raw: RawWasherStatus | null, health: { state: string } | null, checkedAt?: string) =>
  normalizeStatus(DeviceStatusSchema.parse(raw), health ? DeviceHealthSchema.parse(health) : null, checkedAt);

type ModernPatch = Partial<Record<"operatingState" | "remainingTime" | "operationTime" | "progress", RawAttribute | undefined>>;

/** `runningWasher` with some modern-capability attributes replaced. */
const withModern = (patch: ModernPatch): RawWasherStatus => ({
  components: {
    main: {
      "samsungce.washerOperatingState": { ...runningWasher.components?.main?.["samsungce.washerOperatingState"], ...patch },
    },
  },
});

describe("normalizeStatus", () => {
  it("reports real values from a running washer", () => {
    expect(read(runningWasher, { state: "ONLINE" }, "2026-11-06T12:36:00Z")).toMatchObject({
      id: 5,
      status: "running",
      remaining: 100,
      total: 146,
      progress: 32,
      course: "무세제 통세척",
      online: true,
      healthKnown: true,
      updatedAt: "2026-11-06T12:35:00Z",
      checkedAt: "2026-11-06T12:36:00Z",
      live: true,
    });
  });

  it("does not show remaining time when offline, paused, or missing", () => {
    expect(read(runningWasher, { state: "OFFLINE" })).toMatchObject({ status: "offline", remaining: null });

    const paused: RawWasherStatus = {
      components: {
        main: {
          ...withModern({ operatingState: { value: "paused" } }).components?.main,
          washerOperatingState: { machineState: { value: "run" } },
        },
      },
    };

    expect(read(paused, null)).toMatchObject({ status: "paused", remaining: null });
    expect(read(withModern({ remainingTime: undefined }), null).remaining).toBeNull();
    expect(read(withModern({ remainingTime: { value: null } }), null).remaining).toBeNull();
    expect(read(withModern({ remainingTime: { value: -1 } }), null).remaining).toBeNull();
  });

  it("treats malformed attributes as unknown instead of guessing", () => {
    const state = read(withModern({ remainingTime: { value: "soon" }, operatingState: { value: "exploding" } }), null);

    expect(state).toMatchObject({ status: "unavailable", remaining: null });
  });

  it("falls back to the legacy capability and to unavailable", () => {
    const legacy: RawWasherStatus = { components: { main: { washerOperatingState: { machineState: { value: "stop" } } } } };

    expect(read(legacy, null)).toMatchObject({ status: "ready", course: "작동하지 않음", healthKnown: false });
    expect(read({}, null)).toMatchObject({ status: "unavailable", course: "상태 확인 필요" });
    expect(read(null, null).status).toBe("unavailable");
  });

  it("clamps progress and ignores non-positive durations", () => {
    const state = read(withModern({ progress: { value: 140 }, operationTime: { value: 0 } }), null);

    expect(state.progress).toBe(100);
    expect(state.total).toBeNull();
  });
});
