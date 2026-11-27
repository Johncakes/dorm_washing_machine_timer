import { ChevronIcon } from "./icons";

interface PreviewNoteProps {
  text: string;
  exampleMode: boolean;
  /** The example toggle is hidden while a live session is connected. */
  showToggle: boolean;
  onToggleExamples: () => void;
}

export function PreviewNote({ text, exampleMode, showToggle, onToggleExamples }: PreviewNoteProps) {
  return (
    <section className="preview-note" aria-label="미리보기 안내">
      <span className="note-icon" aria-hidden="true">
        i
      </span>
      <p>
        {exampleMode ? (
          <>
            <strong>상태별 디자인 예시를 보고 있어요.</strong> 아래의 기기 상태와 시간은 실제 현황이 아닙니다.
          </>
        ) : (
          text
        )}
      </p>
      {showToggle && (
        <button type="button" aria-pressed={exampleMode} onClick={onToggleExamples}>
          <span>{exampleMode ? "실제 현황으로 돌아가기" : "상태별 예시 보기"}</span>
          <ChevronIcon />
        </button>
      )}
    </section>
  );
}
