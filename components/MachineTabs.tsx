"use client";
import { useRef } from "react";
import { KIND_LABELS } from "@/lib/laundry/format";
import { MACHINES_PER_KIND } from "@/lib/laundry/machines";
import type { MachineKind } from "@/lib/laundry/types";
import { TabIcon } from "./icons";

const KINDS: MachineKind[] = ["washer", "dryer"];

interface MachineTabsProps {
  selected: MachineKind;
  onSelect: (kind: MachineKind) => void;
}

/** Washer/dryer tabs with roving tabindex and arrow/Home/End keys (WAI-ARIA tabs pattern). */
export function MachineTabs({ selected, onSelect }: MachineTabsProps) {
  const refs = useRef<Partial<Record<MachineKind, HTMLButtonElement | null>>>({});

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const next =
      event.key === "Home"
        ? "washer"
        : event.key === "End"
          ? "dryer"
          : event.key === "ArrowLeft" || event.key === "ArrowRight"
            ? selected === "washer"
              ? "dryer"
              : "washer"
            : null;
    if (!next) return;
    event.preventDefault();
    onSelect(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="tabs" role="tablist" aria-label="기기 종류">
      {KINDS.map((kind) => {
        const isSelected = kind === selected;
        return (
          <button
            key={kind}
            ref={(el) => {
              refs.current[kind] = el;
            }}
            className={`tab${isSelected ? " selected" : ""}`}
            id={`${kind}-tab`}
            role="tab"
            type="button"
            aria-selected={isSelected}
            aria-controls="machines"
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(kind)}
            onKeyDown={handleKeyDown}
          >
            <TabIcon kind={kind} />
            {KIND_LABELS[kind]}
            <span className="tab-count">{MACHINES_PER_KIND}</span>
          </button>
        );
      })}
    </div>
  );
}
