"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOpsCenter } from "@/hooks/useOpsCenter";
import { useSubscription } from "@/contexts/SubscriptionContext";
import type { OpsMultiViewCount } from "@/lib/ops/opsCenter.types";
import OpsHero from "@/components/ops/OpsHero";
import OpsGrid from "@/components/ops/OpsGrid";
import OpsTimeline from "@/components/ops/OpsTimeline";
import ContextRadar from "@/components/ops/ContextRadar";
import LiveConsensusLayer from "@/components/ops/LiveConsensusLayer";
import MarketDistortionMonitor from "@/components/ops/MarketDistortionMonitor";
import MultiViewSelector from "@/components/ops/MultiViewSelector";
import TacticalReplayStrip from "@/components/ops/TacticalReplayStrip";
import { consumeOpsCommand } from "@/lib/command/readPendingCommand";
import "@/app/styles/ops-center.css";

export default function OpsCenter() {
  const { can, isAdmin } = useSubscription();
  const { center, loading, error } = useOpsCenter();
  const rootRef = useRef<HTMLDivElement>(null);

  const [viewCount, setViewCount] = useState<OpsMultiViewCount>(2);
  const [selectedFixtureId, setSelectedFixtureId] = useState<string | null>(null);
  const [broadcastMode, setBroadcastMode] = useState(false);

  const hasAccess = can("ops") || isAdmin;

  const toggleBroadcast = useCallback(async () => {
    if (!broadcastMode) {
      setBroadcastMode(true);
      try {
        await rootRef.current?.requestFullscreen?.();
      } catch {
        /* fallback CSS only */
      }
      return;
    }
    setBroadcastMode(false);
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ignore */
      }
    }
  }, [broadcastMode]);

  useEffect(() => {
    const pending = consumeOpsCommand();
    if (!pending) return;
    if (pending.view) setViewCount(pending.view);
    if (pending.broadcast) {
      setBroadcastMode(true);
      void rootRef.current?.requestFullscreen?.();
    }
  }, []);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setBroadcastMode(false);
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    if (!center?.matches.length) return;
    if (!selectedFixtureId || !center.matches.some((m) => m.fixtureId === selectedFixtureId)) {
      setSelectedFixtureId(center.matches[0]!.fixtureId);
    }
  }, [center, selectedFixtureId]);

  if (loading && !center) {
    return (
      <div className="gp-ops">
        <div className="gp-ops-skeleton" />
        <div className="gp-ops-skeleton gp-ops-skeleton--tall" />
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="gp-ops gp-ops--gate">
        <p>Live OPS Center disponível no plano com acesso operacional.</p>
        <Link href="/upgrade" className="gp-ops-link-btn">
          Ver planos
        </Link>
        <Link href="/terminal" className="gp-ops-link-btn gp-ops-link-btn--ghost">
          Central ao vivo
        </Link>
      </div>
    );
  }

  if (!center) {
    return (
      <div className="gp-ops">
        <p className="gp-ops-empty">{error ?? "OPS Center indisponível."}</p>
      </div>
    );
  }

  const filteredTimeline = selectedFixtureId
    ? center.timeline.filter(
        (t) => !t.fixtureId || t.fixtureId === selectedFixtureId
      )
    : center.timeline;

  return (
    <div
      ref={rootRef}
      className={`gp-ops ${broadcastMode ? "gp-ops--broadcast" : ""}`}
    >
      {center.sandbox ? (
        <p className="gp-ops-empty" role="alert" style={{ marginBottom: "1rem" }}>
          <strong>Sandbox OPS</strong> — dados simulados. Defina OPS_CENTER_SANDBOX=false em
          produção para agregar jogos reais.
        </p>
      ) : null}
      <div className="gp-ops__toolbar">
        <MultiViewSelector
          value={viewCount}
          onChange={setViewCount}
          broadcastMode={broadcastMode}
          onBroadcastToggle={() => void toggleBroadcast()}
        />
        <div className="gp-ops__toolbar-links">
          <Link href="/workspace">Workspace</Link>
          <Link href="/network">Rede</Link>
          <Link href="/terminal">Terminal</Link>
        </div>
      </div>

      <OpsHero hero={center.hero} sandbox={center.sandbox} />
      <TacticalReplayStrip items={center.tacticalReplay} />

      <div className="gp-ops__main">
        <div className="gp-ops__primary">
          <OpsGrid
            matches={center.matches}
            viewCount={viewCount}
            selectedFixtureId={selectedFixtureId}
            onSelect={setSelectedFixtureId}
          />
          <OpsTimeline events={filteredTimeline} />
        </div>
        <aside className="gp-ops__aside">
          <LiveConsensusLayer hero={center.hero} />
          <ContextRadar cells={center.radar} hotLeagues={center.hotLeagues} />
          <MarketDistortionMonitor items={center.distortions} />
        </aside>
      </div>

      {error && (
        <p className="gp-ops-empty" role="alert">
          {error} — exibindo último snapshot.
        </p>
      )}
    </div>
  );
}
