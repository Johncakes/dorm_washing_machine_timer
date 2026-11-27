import { STATUS_LABELS, courseLine, machineAriaLabel, machineName, sourceLabel } from "@/lib/laundry/format";
import type { Machine, MachineKind } from "@/lib/laundry/types";
import { MachineClock } from "./MachineClock";
import { ModelIcon, VentIcon } from "./icons";

interface MachineCardProps {
  machine: Machine;
  kind: MachineKind;
  exampleMode: boolean;
  onSelect: (id: number) => void;
}

/** One washer or dryer, drawn as an appliance front with its clock-face door. */
export function MachineCard({ machine, kind, exampleMode, onSelect }: MachineCardProps) {
  const running = machine.status === "running";
  return (
    <article className="machine-unit" data-status={machine.status}>
      <div className="machine-label">
        <h3 className="machine-number">{machineName(kind, machine.id)}</h3>
        <span className="state-chip">
          <span className="status-dot" aria-hidden="true" />
          {STATUS_LABELS[machine.status]}
        </span>
      </div>
      <button
        className="appliance"
        type="button"
        aria-label={machineAriaLabel(machine, kind, exampleMode)}
        onClick={() => onSelect(machine.id)}
      >
        <span className="control-panel" aria-hidden="true">
          <span className="dispenser">
            <i />
            <i />
          </span>
          <span className="panel-right">
            <i className="dial-knob" />
            <i className="power-light" />
          </span>
        </span>
        <div className="machine-body">
          <MachineClock machine={machine} />
          <p className="machine-course">{courseLine(machine, kind)}</p>
          <span className="machine-bottom" aria-hidden="true">
            <span className="model-type">
              <ModelIcon kind={kind} />
              {kind === "dryer" ? "DRYER" : "WASHER"}
            </span>
            <VentIcon />
          </span>
        </div>
      </button>
      <p className="machine-caption">
        {running && typeof machine.progress === "number" && (
          <>
            진행률 <strong>{machine.progress}%</strong> <span aria-hidden="true">·</span>{" "}
          </>
        )}
        {sourceLabel(machine)}
      </p>
    </article>
  );
}
