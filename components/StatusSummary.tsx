import { STATUS_LABELS, SUMMARY_ORDER, countByStatus } from "@/lib/laundry/format";
import type { Machine } from "@/lib/laundry/types";

interface StatusSummaryProps {
  machines: Machine[];
  mode: string;
}

/** "대기 중 3대 · 작동 중 2대 …" row above the grid. */
export function StatusSummary({ machines, mode }: StatusSummaryProps) {
  const counts = countByStatus(machines);

  return (
    <div className="status-summary" id="status-summary" aria-live="polite">
      {SUMMARY_ORDER.filter((status) => counts[status]).map((status) => (
        <span key={status} className="summary-item">
          <span className={`status-dot dot-${status}`} aria-hidden="true" />
          {STATUS_LABELS[status]} <strong>{counts[status]}대</strong>
        </span>
      ))}
      <span className="summary-mode">{mode}</span>
    </div>
  );
}
