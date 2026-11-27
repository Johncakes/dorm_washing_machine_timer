import { LIVE_WASHER_ID, type Machine, type MachineKind } from "./types";

export const MACHINES_PER_KIND = 5;

/** Every machine before any connection: unknown status. */
export function unconnectedMachines(): Record<MachineKind, Machine[]> {
  const make = () => Array.from({ length: MACHINES_PER_KIND }, (_, i): Machine => ({ id: i + 1, status: "unknown" }));

  return { washer: make(), dryer: make() };
}

/**
 * Clearly labelled design examples showing every visual state.
 * These are not real readings and are hidden while a live session is connected.
 */
export const EXAMPLE_MACHINES: Record<MachineKind, Machine[]> = {
  washer: [
    { id: 1, status: "ready" },
    { id: 2, status: "running", remaining: 22, total: 60, progress: 63, course: "표준 세탁" },
    { id: 3, status: "ready" },
    { id: 4, status: "error" },
    { id: 5, status: "running", remaining: 100, total: 146, progress: 32, course: "무세제 통세척" },
  ],
  dryer: [
    { id: 1, status: "running", remaining: 16, total: 60, progress: 73, course: "표준 건조" },
    { id: 2, status: "ready" },
    { id: 3, status: "running", remaining: 42, total: 80, progress: 48, course: "이불 건조" },
    { id: 4, status: "offline" },
    { id: 5, status: "ready" },
  ],
};

/** Real machines with the live washer (if any) slotted in. */
export function withLiveWasher(liveWasher: Machine | null): Record<MachineKind, Machine[]> {
  const machines = unconnectedMachines();

  if (liveWasher) machines.washer[LIVE_WASHER_ID - 1] = { ...liveWasher, id: LIVE_WASHER_ID, live: true };

  return machines;
}
