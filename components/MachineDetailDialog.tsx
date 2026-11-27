import {
  STATUS_LABELS,
  detailNote,
  formatMinutes,
  isTimed,
  koreanTime,
  machineName,
  sourceDescription,
} from "@/lib/laundry/format";
import type { Machine, MachineKind } from "@/lib/laundry/types";
import { MachineClock } from "./MachineClock";
import { Modal } from "./Modal";
import { CloseIcon } from "./icons";

interface MachineDetailDialogProps {
  machine: Machine | null;
  kind: MachineKind;
  exampleMode: boolean;
  onClose: () => void;
}

function facts(m: Machine, exampleMode: boolean): [string, string][] {
  const rows: [string, string][] = [
    ["위치", "율곡관 지하 1층"],
    ["작동 상태", STATUS_LABELS[m.status]],
  ];

  if (m.status === "running") {
    rows.push(
      ["남은 시간", isTimed(m) ? formatMinutes(m.remaining) : "확인 중"],
      ["진행률", typeof m.progress === "number" ? `${m.progress}%` : "확인 중"],
      ["현재 과정", m.course ?? "확인 중"],
    );
  }

  rows.push(["정보 구분", sourceDescription(m, exampleMode)]);

  if (m.checkedAt) rows.push(["마지막 확인", koreanTime(m.checkedAt)]);

  if (m.updatedAt) rows.push(["기기 값 갱신", koreanTime(m.updatedAt)]);

  return rows;
}

/** Details for one machine. Stays live: if the machine updates while open, so does the dialog. */
export function MachineDetailDialog({ machine, kind, exampleMode, onClose }: MachineDetailDialogProps) {
  return (
    <Modal open={!!machine} onClose={onClose} id="detail-dialog" labelledBy="detail-title">
      <div className="dialog-header">
        <span className="dialog-kicker">기기 자세히 보기</span>
        <button type="button" aria-label="상세 정보 닫기" onClick={onClose}>
          <CloseIcon />
        </button>
      </div>
      {machine && (
        <div>
          <h2 id="detail-title">{machineName(kind, machine.id)}</h2>
          <p className="detail-status">
            <span className={`status-dot dot-${machine.status}`} aria-hidden="true" />
            {STATUS_LABELS[machine.status]}
          </p>
          <div className="detail-clock machine-unit" data-status={machine.status}>
            <MachineClock machine={machine} />
          </div>
          <dl className="detail-facts">
            {facts(machine, exampleMode).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className="detail-note">{detailNote(machine)}</p>
        </div>
      )}
    </Modal>
  );
}
