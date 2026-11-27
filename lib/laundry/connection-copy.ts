/** Text that depends on the connection state. Kept pure so it can be unit-tested. */
import { koreanTime } from "./format";

export type LivePhase = "disconnected" | "connected" | "error" | "expired";

export interface ConnectionView {
  active: boolean;
  phase: LivePhase;
  notice: string | null;
  lastChecked: string | null;
  lastDeviceUpdate: string | null;
  visible: boolean;
}

export function badge({ active, phase }: ConnectionView): { text: string; tone: "connected" | "error" | null } {
  const tone = active && phase === "connected" ? "connected" : phase === "error" || phase === "expired" ? "error" : null;
  const text = active ? (phase === "connected" ? "연결됨" : "확인 필요") : phase === "expired" ? "토큰 만료" : "미연결";

  return { text, tone };
}

/** Banner text, unless the example view is showing (that one is rendered separately). */
export function bannerText({ active, phase, notice }: ConnectionView): string {
  if (notice) return notice;

  if (active)
    return phase === "connected"
      ? "5번 세탁기를 삼성 서버에서 10초마다 확인하고 있어요. 나머지 기기는 아직 연동 전이에요."
      : "최신 정보를 받지 못해 남은 시간 표시를 멈췄어요. 다시 연결되면 갱신됩니다.";

  return "실시간 연결 전이에요. SmartThings 연결에서 조회용 토큰을 입력해 주세요.";
}

export function syncText({ active, lastChecked, lastDeviceUpdate, visible }: ConnectionView): string {
  if (!active) return "SmartThings 연결 후 실제 상태를 표시합니다. 토큰은 발급 후 24시간 동안 유효해요.";
  const parts = [`10초마다 확인 · 마지막 성공 ${lastChecked ? koreanTime(lastChecked) : "확인 중"}`];

  if (lastDeviceUpdate) parts.push(`기기 값 갱신 ${koreanTime(lastDeviceUpdate)}`);

  if (!visible) parts.push("화면을 다시 열면 확인을 재개해요");

  return parts.join(" · ");
}

export function summaryMode(exampleMode: boolean, active: boolean): string {
  return exampleMode ? "상태별 예시" : active ? "10초 간격 확인" : "미연결";
}

export function recordLabel(exampleMode: boolean, active: boolean): string {
  return exampleMode ? "상태 예시" : active ? "실제 조회" : "연결 전";
}
