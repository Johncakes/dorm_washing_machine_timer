import type { Machine, MachineKind } from "@/lib/laundry/types";
import { MachineCard } from "./MachineCard";

interface MachineGridProps {
  machines: Machine[];
  kind: MachineKind;
  exampleMode: boolean;
  onSelect: (id: number) => void;
}

export function MachineGrid({ machines, kind, exampleMode, onSelect }: MachineGridProps) {
  return (
    <div className="machine-grid" id="machines" role="tabpanel" aria-labelledby={`${kind}-tab`} tabIndex={0}>
      {machines.map((machine) => (
        <MachineCard key={machine.id} machine={machine} kind={kind} exampleMode={exampleMode} onSelect={onSelect} />
      ))}
    </div>
  );
}
