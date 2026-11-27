import { KIND_LABELS, STATUS_LABELS, formatMinutes, machineName, remainingFraction, soonestFinishing } from "@/lib/laundry/format";
import type { Machine, MachineKind } from "@/lib/laundry/types";

interface QuickLookProps {
  machines: Machine[];
  kind: MachineKind;
  /** The live washer, when connected and showing washers. */
  connectedMachine: Machine | null;
  recordLabel: string;
}

/** Side card with the machine that finishes soonest. */
export function QuickLook({ machines, kind, connectedMachine, recordLabel }: QuickLookProps) {
  const soonest = soonestFinishing(machines);

  let name: string;
  let time: React.ReactNode;
  let caption: string;

  if (soonest) {
    name = machineName(kind, soonest.id);
    time = (
      <>
        {formatMinutes(soonest.remaining)}
        <span>남음</span>
      </>
    );
    caption = `${soonest.course ?? ""}${typeof soonest.progress === "number" ? ` · 진행률 ${soonest.progress}%` : ""}`;
  } else if (connectedMachine) {
    name = machineName("washer", connectedMachine.id);
    time = STATUS_LABELS[connectedMachine.status];
    caption = connectedMachine.course || "남은 시간은 작동 중에 표시돼요";
  } else {
    name = KIND_LABELS[kind];
    time = "아직 연동 전";
    caption = "연결 후 기기별 남은 시간이 표시돼요";
  }

  return (
    <aside className="quick-look" aria-label="작동 중인 기기 요약">
      <div className="quick-top">
        <span className="quick-kicker">남은 시간 미리 보기</span>
        <span className="record-label">{recordLabel}</span>
      </div>
      <div className="quick-body">
        <div className="mini-timer" aria-hidden="true">
          <svg viewBox="0 0 80 80">
            <circle className="mini-track" cx="40" cy="40" r="32" />
            <circle
              id="quick-ring"
              cx="40"
              cy="40"
              r="32"
              pathLength={100}
              strokeDasharray={`${soonest ? remainingFraction(soonest) * 100 : 0} 100`}
            />
            <path d="M40 23v17l10 7" />
          </svg>
        </div>
        <div>
          <p>{name}</p>
          <strong>{time}</strong>
        </div>
      </div>
      <p className="quick-caption">{caption}</p>
    </aside>
  );
}
