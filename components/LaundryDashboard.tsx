"use client";
import { useState } from "react";
import { useLiveConnection } from "@/hooks/useLiveConnection";
import { badge, bannerText, recordLabel, summaryMode, syncText } from "@/lib/laundry/connection-copy";
import { KIND_LABELS } from "@/lib/laundry/format";
import { EXAMPLE_MACHINES, withLiveWasher } from "@/lib/laundry/machines";
import type { MachineKind } from "@/lib/laundry/types";
import { ConnectionDialog } from "./ConnectionDialog";
import { Header } from "./Header";
import { Intro } from "./Intro";
import { MachineDetailDialog } from "./MachineDetailDialog";
import { MachineGrid } from "./MachineGrid";
import { MachineTabs } from "./MachineTabs";
import { PreviewNote } from "./PreviewNote";
import { QuickLook } from "./QuickLook";
import { ReadingGuide } from "./ReadingGuide";
import { StatusSummary } from "./StatusSummary";
import { ChevronIcon } from "./icons";

/** The whole dashboard: owns UI state (tab, example mode, dialogs) and wires in the live connection. */
export function LaundryDashboard() {
  const live = useLiveConnection();
  const [kind, setKind] = useState<MachineKind>("washer");
  const [exampleToggle, setExampleToggle] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [connectionOpen, setConnectionOpen] = useState(false);

  // Examples are never shown over live data.
  const exampleMode = exampleToggle && !live.active;
  const machines = (exampleMode ? EXAMPLE_MACHINES : withLiveWasher(live.washer))[kind];
  const selected = machines.find((m) => m.id === selectedId) ?? null;
  const connectedMachine = !exampleMode && kind === "washer" && live.active ? machines[4] : null;
  const status = badge(live);

  const openConnection = () => {
    live.setFeedback(live.active ? { message: "이 브라우저에서는 연결된 상태예요.", success: false } : null);
    setConnectionOpen(true);
  };

  return (
    <>
      <a className="skip-link" href="#machines">
        기기 현황으로 바로 가기
      </a>
      <div className="page">
        <Header badgeText={status.text} badgeTone={status.tone} connected={live.active} onOpenConnection={openConnection} />
        <main>
          <Intro
            aside={
              <QuickLook
                machines={machines}
                kind={kind}
                connectedMachine={connectedMachine}
                recordLabel={recordLabel(exampleMode, live.active)}
              />
            }
          />
          <PreviewNote
            text={bannerText(live)}
            exampleMode={exampleMode}
            showToggle={!live.active}
            onToggleExamples={() => setExampleToggle((on) => !on)}
          />
          <section className="laundry-section" aria-labelledby="section-title">
            <div className="section-heading">
              <MachineTabs selected={kind} onSelect={setKind} />
              <p className="section-meta">
                각 기기를 누르면 자세히 볼 수 있어요
                <ChevronIcon x={5} />
              </p>
            </div>
            <h2 className="visually-hidden" id="section-title">
              {KIND_LABELS[kind]} 현황
            </h2>
            <StatusSummary machines={machines} mode={summaryMode(exampleMode, live.active)} />
            <MachineGrid machines={machines} kind={kind} exampleMode={exampleMode} onSelect={setSelectedId} />
            <ReadingGuide />
          </section>
          <p className="live-sync" role="status" aria-live="polite">
            {syncText(live)}
          </p>
          <footer className="footer">
            <p>작동이 끝났어도 세탁물이 남아 있을 수 있어요.</p>
            <span>율곡관 스마트 세탁실 · 로컬 연결 테스트</span>
          </footer>
        </main>
      </div>
      <MachineDetailDialog machine={selected} kind={kind} exampleMode={exampleMode} onClose={() => setSelectedId(null)} />
      <ConnectionDialog
        open={connectionOpen}
        onClose={() => setConnectionOpen(false)}
        connected={live.active}
        connecting={live.connecting}
        disconnecting={live.disconnecting}
        feedback={live.feedback}
        onConnect={live.connect}
        onDisconnect={live.disconnect}
        onFeedback={live.setFeedback}
      />
    </>
  );
}
