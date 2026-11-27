/** Inline SVG icons used across the dashboard. All are decorative (aria-hidden). */
import type { MachineKind, MachineStatus } from "@/lib/laundry/types";

export function BrandIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="none">
      <rect x="6" y="3" width="20" height="26" rx="5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M6 10h20" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="11" cy="6.7" r="1" fill="currentColor" />
      <path d="M16 14a5 5 0 1 1-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function LocationIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M16 8.2c0 4.3-6 8.3-6 8.3S4 12.5 4 8.2a6 6 0 1 1 12 0Z" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function ChevronIcon({ x = 6 }: { x?: 5 | 6 }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={x === 6 ? "m6 4 4 4-4 4" : "m5 4 4 4-4 4"}
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function GuideClockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 3" />
      <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/** Appliance outline used on the washer/dryer tabs. */
export function TabIcon({ kind }: { kind: MachineKind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="2.5" width="14" height="19" rx="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 8h14" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 5.5h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {kind === "washer" ? (
        <circle cx="12" cy="14.5" r="4" stroke="currentColor" strokeWidth="1.6" />
      ) : (
        <path d="M10 11c-3 3 3 3 0 6m4-6c-3 3 3 3 0 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** Small wave (washer) or heat (dryer) mark on the machine's bottom strip. */
export function ModelIcon({ kind }: { kind: MachineKind }) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d={kind === "dryer" ? "M5 3c-3 4 3 5 0 9m6-9c-3 4 3 5 0 9" : "M2 7c2-2 4 2 6 0s4 2 6 0M2 11c2-2 4 2 6 0s4 2 6 0"}
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function VentIcon() {
  return (
    <svg viewBox="0 0 30 9" fill="none" aria-hidden="true">
      <path d="M1 2h28M1 5h28M1 8h28" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

const OFFLINE_PATHS = (
  <>
    <path d="M3 3l18 18M2 8a17 17 0 0 1 3-1.8M9 5.3A17 17 0 0 1 22 8M5 12a11 11 0 0 1 3-1.6M12 10a11 11 0 0 1 7 2M8.5 15.5a5 5 0 0 1 7 0" />
    <circle cx="12" cy="19" r="1" />
  </>
);

const STATUS_PATHS: Record<MachineStatus, React.ReactNode> = {
  unknown: (
    <path d="m8 16-2 2a4 4 0 0 1-5.7-5.6l4-4A4 4 0 0 1 10 8m6 0 2-2a4 4 0 0 1 5.7 5.6l-4 4A4 4 0 0 1 14 16M3 3l18 18" />
  ),
  ready: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" />
    </>
  ),
  error: <path d="m8 3 3 3-3 3-3-3a6 6 0 0 0 7 8l6 6a2.1 2.1 0 0 0 3-3l-6-6a6 6 0 0 0-7-8Z" />,
  offline: OFFLINE_PATHS,
  unavailable: OFFLINE_PATHS,
  paused: <path d="M8 5v14M16 5v14" strokeWidth="3" />,
  running: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
};

/** Icon shown inside the clock face when there is no remaining time. */
export function StatusIcon({ status }: { status: MachineStatus }) {
  return (
    <svg
      className="door-icon"
      viewBox="0 0 26 26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {STATUS_PATHS[status]}
    </svg>
  );
}
