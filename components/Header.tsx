import { BrandIcon } from "./icons";

interface HeaderProps {
  badgeText: string;
  badgeTone: "connected" | "error" | null;
  connected: boolean;
  onOpenConnection: () => void;
}

export function Header({ badgeText, badgeTone, connected, onOpenConnection }: HeaderProps) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          <BrandIcon />
        </span>
        <span>
          율곡관 <span className="brand-sub">스마트 세탁실</span>
        </span>
      </div>
      <div className="header-actions">
        <span className={`preview-tag${badgeTone ? ` ${badgeTone}` : ""}`}>
          <span />
          {badgeText}
        </span>
        <button type="button" className="connect-button" onClick={onOpenConnection}>
          {connected ? "연결 관리" : "SmartThings 연결"}
        </button>
      </div>
    </header>
  );
}
