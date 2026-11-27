"use client";
import { useRef } from "react";
import type { Feedback } from "@/hooks/useLiveConnection";
import { Modal } from "./Modal";

interface ConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  connected: boolean;
  connecting: boolean;
  disconnecting: boolean;
  feedback: Feedback | null;
  onConnect: (token: string) => Promise<void>;
  onDisconnect: () => void;
  onFeedback: (feedback: Feedback | null) => void;
}

/**
 * Where the owner pastes a SmartThings PAT. The input is uncontrolled and cleared
 * right after submit, so the token never lives in React state.
 */
export function ConnectionDialog(props: ConnectionDialogProps) {
  const { open, onClose, connected, connecting, disconnecting, feedback, onConnect, onDisconnect, onFeedback } = props;
  const input = useRef<HTMLInputElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const field = input.current;
    if (!field) return;
    const token = field.value.trim();
    field.value = "";
    if (!token) {
      onFeedback({ message: "토큰을 입력해 주세요.", success: false });
      return;
    }
    await onConnect(token);
  };

  return (
    <Modal open={open} onClose={onClose} id="connection-dialog" labelledBy="connection-title">
      <div className="dialog-header">
        <span className="dialog-kicker">관리자 · 한 대 연결 테스트</span>
        <button type="button" aria-label="연결 창 닫기" onClick={onClose}>
          ×
        </button>
      </div>
      <h2 id="connection-title">SmartThings 연결</h2>
      <p className="connection-description">율곡관 세탁기 5번의 작동 상태와 남은 시간을 10초마다 확인합니다.</p>
      <form id="connection-form" onSubmit={handleSubmit}>
        <label htmlFor="samsung-token">SmartThings 조회용 토큰</label>
        <input
          ref={input}
          id="samsung-token"
          name="token"
          type="password"
          required
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="none"
          maxLength={2048}
          placeholder="발급받은 토큰을 여기에 붙여넣으세요"
        />
        <p className="token-help">
          ‘모든 디바이스 표시·보기’ 권한으로 발급한 토큰을 입력하세요. 관리·제어 권한은 필요하지 않아요.
        </p>
        <button className="primary-button" type="submit" disabled={connecting}>
          {connecting ? "삼성에서 상태 확인 중…" : "5번 세탁기 연결"}
        </button>
      </form>
      <p className={`connection-feedback${feedback?.success ? " success" : ""}`} role="status" aria-live="polite">
        {feedback?.message}
      </p>
      <button className="disconnect-button" type="button" hidden={!connected} disabled={disconnecting} onClick={onDisconnect}>
        이 브라우저 연결 해제
      </button>
      <div className="connection-notes">
        <p>토큰은 서버에서 암호화해 이 브라우저의 보호된 쿠키로 보관합니다. 웹페이지 코드나 일반 저장소에는 저장하지 않습니다.</p>
        <p>토큰은 발급 후 24시간 뒤 만료돼요. 만료되면 새 토큰으로 다시 연결하세요. 다른 브라우저에서는 다시 입력해야 합니다.</p>
        <p>
          표시되는 시간은 세탁기가 삼성 서버에 마지막으로 보낸 값입니다. 세탁기 정보가 늦게 갱신되면 화면 반영도 늦어질 수
          있어요.
        </p>
      </div>
    </Modal>
  );
}
