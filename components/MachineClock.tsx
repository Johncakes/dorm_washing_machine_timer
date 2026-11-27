import { STATUS_LABELS, clockCaption, isTimed, remainingFraction, splitMinutes } from "@/lib/laundry/format";
import type { Machine } from "@/lib/laundry/types";
import { StatusIcon } from "./icons";

const CENTER = 100;
const RING_RADIUS = 76;

const point = (angle: number, radius: number) => ({
  x: (CENTER + Math.sin(angle) * radius).toFixed(2),
  y: (CENTER - Math.cos(angle) * radius).toFixed(2),
});

// 60 minute ticks, every 5th one longer. Static, so computed once.
const TICKS = Array.from({ length: 60 }, (_, i) => {
  const angle = (i * Math.PI) / 30;
  const major = i % 5 === 0;
  const from = point(angle, major ? 85 : 88);
  const to = point(angle, 91);
  return { i, major, from, to };
});

function RemainingTime({ minutes }: { minutes: number }) {
  const { hours, mins } = splitMinutes(minutes);
  if (!hours) {
    return (
      <span className="clock-time compact">
        <span className="number">{mins}</span>
        <span className="unit">분</span>
      </span>
    );
  }
  return (
    <span className="clock-time">
      <span className="time-row">
        <span className="number">{hours}</span>
        <span className="unit">시간</span>
      </span>
      {mins > 0 && (
        <span className="time-row">
          <span className="number">{mins}</span>
          <span className="unit">분</span>
        </span>
      )}
    </span>
  );
}

/** The round "door" of a machine: a clock face whose ring shrinks as the cycle ends. */
export function MachineClock({ machine }: { machine: Machine }) {
  const timed = isTimed(machine);
  const fraction = timed ? remainingFraction(machine) : 0;
  const pin = point(fraction * Math.PI * 2, RING_RADIUS);

  return (
    <div className="door-wrap" aria-hidden="true">
      <svg className="clock-face" viewBox="0 0 200 200">
        {TICKS.map(({ i, major, from, to }) => (
          <line key={i} className={`clock-tick${major ? " major" : ""}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
        ))}
        <circle className="clock-track" cx={CENTER} cy={CENTER} r={RING_RADIUS} />
        {timed && (
          <>
            <circle
              className="clock-progress"
              cx={CENTER}
              cy={CENTER}
              r={RING_RADIUS}
              pathLength={100}
              strokeDasharray={`${fraction * 100} 100`}
            />
            <circle className="clock-pin" cx={pin.x} cy={pin.y} r={4.3} />
          </>
        )}
      </svg>
      <div className="clock-content">
        {timed ? (
          <>
            <RemainingTime minutes={machine.remaining} />
            <span className="remaining-label">남음</span>
          </>
        ) : (
          <>
            <StatusIcon status={machine.status} />
            <span className="empty-title">{STATUS_LABELS[machine.status]}</span>
            <span className="empty-caption">{clockCaption(machine.status)}</span>
          </>
        )}
      </div>
    </div>
  );
}
