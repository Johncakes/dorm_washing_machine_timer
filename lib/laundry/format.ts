/** Pure display helpers for the dashboard. No React, so they are easy to test. */
import type { Machine, MachineKind, MachineStatus } from "./types";

export const STATUS_LABELS: Record<MachineStatus, string> = {
  running: "작동 중",
  ready: "대기 중",
  paused: "일시정지",
  unavailable: "확인 필요",
  unknown: "연동 전",
  error: "확인 필요",
  offline: "오프라인",
};

/** Order used by the status summary row. */
export const SUMMARY_ORDER: MachineStatus[] = ["ready", "running", "paused", "unavailable", "error", "offline", "unknown"];

export const KIND_LABELS: Record<MachineKind, string> = { washer: "세탁기", dryer: "건조기" };

export const machineName = (kind: MachineKind, id: number) => `${KIND_LABELS[kind]} ${id}번`;

/** True when there is a real remaining time to show. */
export function isTimed(m: Machine): m is Machine & { remaining: number } {
  return m.status === "running" && typeof m.remaining === "number" && Number.isFinite(m.remaining);
}

const isNumber = (value: number | null | undefined): value is number => typeof value === "number" && Number.isFinite(value);

/** Fraction of the cycle still left (0–1): from remaining/total, else from progress. */
export function remainingFraction(m: Machine): number {
  const raw =
    m.total && m.total > 0 && isNumber(m.remaining)
      ? m.remaining / m.total
      : isNumber(m.progress)
        ? 1 - m.progress / 100
        : 1;
  return Math.min(1, Math.max(0, raw));
}

export function splitMinutes(minutes: number) {
  return { hours: Math.floor(minutes / 60), mins: minutes % 60 };
}

/** "1시간 5분", "1시간", "5분", "0분". */
export function formatMinutes(minutes: number): string {
  const { hours, mins } = splitMinutes(minutes);
  return [hours ? `${hours}시간` : "", mins || !hours ? `${mins}분` : ""].filter(Boolean).join(" ");
}

/** HH:MM:SS in Korea time, or "확인 중" if the value isn't a date. */
export function koreanTime(value: string | null | undefined): string {
  const date = new Date(value ?? "");
  if (Number.isNaN(date.valueOf())) return "확인 중";
  return date.toLocaleTimeString("ko-KR", {
    timeZone: "Asia/Seoul",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** Caption under the status inside the clock face when no time is shown. */
export function clockCaption(status: MachineStatus): string {
  switch (status) {
    case "unknown":
      return "정보 연결 준비 중";
    case "ready":
      return "작동하지 않아요";
    case "error":
      return "현장 확인이 필요해요";
    case "paused":
      return "기기가 잠시 멈췄어요";
    case "running":
      return "남은 시간 확인 중";
    default:
      return "최신 정보 확인 필요";
  }
}

/** Line under the clock on a machine card. */
export function courseLine(m: Machine, kind: MachineKind): string {
  switch (m.status) {
    case "running":
      return m.course ?? "작동 중";
    case "paused":
      return m.course ?? "기기가 잠시 멈췄어요";
    case "unknown":
      return "남은 시간 확인 준비 중";
    case "ready":
      return kind === "dryer" ? "새로운 건조를 기다리는 중" : "새로운 세탁을 기다리는 중";
    case "error":
      return "기기 점검이 필요해요";
    default:
      return "기기 정보 수신이 안 돼요";
  }
}

/** Where the data on a card came from. */
export function sourceLabel(m: Machine): string {
  if (m.live) return "실제 조회";
  return m.status === "unknown" ? "연결 후 상태가 표시돼요" : "상태 예시";
}

export function sourceDescription(m: Machine, exampleMode: boolean): string {
  if (m.live) return "SmartThings API 실제 조회";
  return exampleMode ? "디자인 예시" : "아직 연결되지 않은 기기";
}

/** Screen-reader label for the machine button. */
export function machineAriaLabel(m: Machine, kind: MachineKind, exampleMode: boolean): string {
  const time = isTimed(m) ? `, ${formatMinutes(m.remaining)} 남음` : "";
  const source = m.live ? "삼성 API 조회" : exampleMode ? "디자인 예시" : "기기 미연동";
  return `${machineName(kind, m.id)}, ${STATUS_LABELS[m.status]}${time}. ${source}. 자세히 보기`;
}

/** Explanation at the bottom of the detail dialog. */
export function detailNote(m: Machine): string {
  if (m.live && (m.status === "offline" || m.status === "unavailable"))
    return "최신 상태를 확인하지 못해 남은 시간을 표시하지 않습니다. 연결이 복구되면 다시 확인합니다.";
  switch (m.status) {
    case "unknown":
      return "기기를 연결하면 작동 상태와 남은 시간을 확인할 수 있어요.";
    case "ready":
      return "대기 중은 기기가 작동하지 않는다는 뜻이에요. 안에 세탁물이 남아 있는지는 현장에서 확인해 주세요.";
    case "running":
      return "색이 있는 원은 전체 예상 시간 중 남은 비율이에요. 기기가 안내하는 예상 시간은 작동 중 달라질 수 있어요.";
    default:
      return "이 상태는 화면 구성을 보여주기 위한 예시예요. 실제 고장이나 연결 상태를 나타내지 않아요.";
  }
}

export function countByStatus(machines: Machine[]): Partial<Record<MachineStatus, number>> {
  const counts: Partial<Record<MachineStatus, number>> = {};
  for (const m of machines) counts[m.status] = (counts[m.status] ?? 0) + 1;
  return counts;
}

/** The running machine that finishes soonest. */
export function soonestFinishing(machines: Machine[]) {
  return machines.filter(isTimed).sort((a, b) => a.remaining - b.remaining)[0];
}
