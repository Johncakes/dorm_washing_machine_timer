import { GuideClockIcon } from "./icons";

export function ReadingGuide() {
  return (
    <div className="reading-guide">
      <span className="guide-clock" aria-hidden="true">
        <GuideClockIcon />
      </span>
      <p>
        <strong>원의 색이 줄어들수록, 종료가 가까워져요.</strong>
        <span>기기 문 안의 숫자는 남은 시간, 원은 전체 예상 시간 중 남은 비율이에요.</span>
      </p>
    </div>
  );
}
