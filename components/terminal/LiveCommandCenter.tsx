"use client";

import { memo, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useOps } from "@/hooks/useOps";
import { useSystemHealth } from "@/hooks/useSystemHealth";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import SignalFeed, { type SignalFeedItem } from "@/components/signals/SignalFeed";
import {
  TerminalCard,
  MetricTile,
  StatusBadge,
  RiskBadge,
  RadarPanel,
  ChaosIndicator,
  EdgeMeter,
  EngineConsensusBar,
  GlowPanel,
} from "@/components/ui/terminal";
import { terminalStagger, terminalFadeUp } from "@/components/ui/terminal/motion";
import { BRAND } from "@/lib/design/brand";

const MetricsRow = memo(function MetricsRow({
  tracked,
  signals,
  avgEdge,
  confidence,
  apiRisk,
}: {
  tracked: number;
  signals: number;
  avgEdge: number;
  confidence: number;
  apiRisk: string;
}) {
  return (
    <div className="app-shell__metrics-grid">
      <MetricTile label="Partidas rastreadas" value={String(tracked)} large />
      <MetricTile label="Sinais ativos" value={String(signals)} accent />
      <MetricTile
        label="Edge médio"
        value={`${avgEdge.toFixed(1)}%`}
        sub="Distorção de mercado"
      />
      <MetricTile
        label="Institutional Confidence"
        value={String(Math.round(confidence))}
        sub="Consenso quantitativo"
        accent
      />
      <MetricTile label="Execution Grade" value="Live" sub="Meta consensus" />
      <MetricTile
        label="API usage risk"
        value={apiRisk}
        sub="SportMonks quota"
      />
    </div>
  );
});

function SystemTrace({ logs }: { logs: { id: string; message: string; timestamp: string; level: string }[] }) {
  return (
    <TerminalCard className="max-h-[420px] overflow-y-auto t-scrollbar">
      {logs.length === 0 ? (
        <p className="font-mono-data text-[var(--text-muted-on-dark)]">Awaiting live data</p>
      ) : (
        logs.slice(0, 40).map((l) => (
          <div
            key={l.id}
            className="mb-2 border-b border-white/[0.06] pb-2 font-mono-data"
          >
            <span className="text-[var(--text-muted-on-dark)]">{l.timestamp.slice(11, 19)}</span>{" "}
            <span className={l.level === "warn" ? "text-amber-400" : ""}>
              {l.message}
            </span>
          </div>
        ))
      )}
    </TerminalCard>
  );
}

export default function LiveCommandCenter() {
  const [tab, setTab] = useState<"overview" | "trace">("overview");
  const ops = useOps();
  const { health } = useSystemHealth();
  const { matches, signals: liveSignals } = useLiveMatches({ pollIntervalMs: 20_000 });

  const avgEdge = ops.marketCalibration?.averageEdge ?? 0;
  const confidence = ops.metaConsensus?.averageInstitutionalConfidence ?? 0;
  const chaosLevel =
    ops.sequenceMemory?.sustainedChaos[0]?.sustainedChaosLevel ??
    ops.microevent?.chaosBursts[0]?.microeventScore ??
    45;

  const signalItems: SignalFeedItem[] = useMemo(() => {
    const fromOps = (ops.signalDecision?.activeSignals ?? []).map((s) => {
      const meta = ops.metaConsensus?.consensusHeatmap.find(
        (c) => c.fixtureId === s.fixtureId
      );
      return {
        id: `ops-${s.fixtureId}-${s.market}`,
        matchLabel: s.matchLabel,
        market: s.market,
        minute: s.minute,
        odd: 0,
        fairOdd: undefined,
        ev: s.ev,
        confidence: s.confidence,
        executionDecision: meta?.executionDecision as SignalFeedItem["executionDecision"],
        executionGrade: meta?.executionGrade,
        reason: "Edge institucional · janela de execução em observação",
        telegramStatus: ops.telegram?.status,
      };
    });
    if (fromOps.length > 0) return fromOps;

    return liveSignals.slice(0, 6).map((sig) => ({
      id: sig.matchId,
      matchLabel: sig.matchLabel,
      market: sig.market,
      minute: 0,
      odd: sig.odd,
      ev: 0,
      confidence: sig.confidence === "HIGH" ? 75 : 55,
      executionDecision: "WATCH" as const,
      reason: sig.reason,
      telegramStatus: ops.telegram?.status,
    }));
  }, [ops, liveSignals]);

  const fpAlerts = ops.metaConsensus?.falsePositiveAlerts ?? [];

  return (
    <motion.div
      variants={terminalStagger}
      initial="hidden"
      animate="show"
      className="w-full min-w-0 max-w-full space-y-8"
    >
      <motion.header variants={terminalFadeUp} className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="t-label flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#FF2B2B] t-live-pulse" />
            {BRAND.tagline}
          </p>
          <h1 className="t-page-title mt-2">Live Command Center</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("overview")}
            className={`t-tab ${tab === "overview" ? "t-tab--active" : ""}`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setTab("trace")}
            className={`t-tab ${tab === "trace" ? "t-tab--active" : ""}`}
          >
            System Trace
          </button>
        </div>
      </motion.header>

      <motion.div variants={terminalFadeUp} className="flex flex-wrap gap-2">
        <StatusBadge status={health?.status === "healthy" ? "ONLINE" : "DEGRADED"} pulse />
        <StatusBadge
          status={ops.status === "live" ? "LIVE" : "SYNC"}
          pulse={ops.status === "live"}
        />
        <span className="t-status-chip">
          Runtime · {health?.status ?? "—"}
        </span>
        <span className="t-status-chip">
          SportMonks · {health?.liveFeed?.status === "CONFIGURED" ? "ONLINE" : "STANDBY"}
        </span>
        <span className="t-status-chip">
          Supabase · {health?.database?.mode ?? "—"}
        </span>
        <span className="t-status-chip">
          Telegram · {ops.telegram?.status ?? "—"}
        </span>
        <RiskBadge level={ops.apiUsage?.alertLevel ?? "SAFE"} />
      </motion.div>

      {tab === "trace" ? (
        <SystemTrace logs={ops.logs} />
      ) : (
        <>
          <MetricsRow
            tracked={ops.livePressure?.matchCount ?? matches.length}
            signals={ops.signalDecision?.activeSignals.length ?? liveSignals.length}
            avgEdge={avgEdge}
            confidence={confidence}
            apiRisk={ops.apiUsage?.alertLevel ?? "SAFE"}
          />

          <div className="app-shell__panel-grid">
            <div className="min-w-0 space-y-5">
              <GlowPanel title="Live Edge Radar" className="min-w-0">
                <RadarPanel
                  value={ops.marketCalibration?.strongestEdgePercent ?? avgEdge * 8}
                  label=""
                  sublabel="Edge institucional"
                />
              </GlowPanel>
              <TerminalCard className="min-w-0">
                <ChaosIndicator level={chaosLevel} />
              </TerminalCard>
            </div>

            <div className="min-w-0">
              <p className="t-label mb-3">Execution Feed</p>
              <SignalFeed items={signalItems} />
            </div>

            <TerminalCard className="min-w-0">
              <p className="t-label mb-3">Market Drift Panel</p>
              <div className="space-y-3">
                {(ops.marketCalibration?.topEdges ?? []).slice(0, 5).map((e) => (
                  <EdgeMeter key={`${e.fixtureId}-${e.market}`} value={e.edgePercent} label={e.market} />
                ))}
                {(ops.marketCalibration?.topEdges ?? []).length === 0 && (
                  <p className="font-mono-data text-[var(--text-muted-on-dark)]">Awaiting live data</p>
                )}
              </div>
            </TerminalCard>

            <TerminalCard className="min-w-0">
              <p className="t-label mb-3">Trigger Windows</p>
              {(ops.temporal?.chaosMap ?? []).slice(0, 4).map((c) => (
                <EdgeMeter
                  key={c.fixtureId}
                  value={c.chaosIndex}
                  label={`${c.matchPhase ?? "—"} · ${c.matchLabel ?? c.fixtureId}`}
                />
              ))}
            </TerminalCard>
          </div>

          <div className="app-shell__panel-grid">
            <TerminalCard>
              <p className="t-label mb-3">Dominant Engines</p>
              <EngineConsensusBar engines={ops.metaConsensus?.dominantEnginesSummary ?? []} />
            </TerminalCard>
            <TerminalCard>
              <p className="t-label mb-3">False Positive Risk</p>
              {fpAlerts.length === 0 ? (
                <p className="font-mono-data text-[var(--text-muted-on-dark)]">Sem alertas elevados</p>
              ) : (
                fpAlerts.slice(0, 5).map((a) => (
                  <div key={a.fixtureId} className="mb-2 font-mono-data">
                    <span className="t-accent">{a.matchLabel ?? a.fixtureId}</span> · FP{" "}
                    {a.falsePositiveRisk}
                  </div>
                ))
              )}
            </TerminalCard>
            <TerminalCard className="min-w-0 lg:col-span-2">
              <p className="t-label mb-3">Live Pressure Metrics</p>
              <div className="max-h-[200px] space-y-2 overflow-y-auto t-scrollbar">
                {(ops.livePressure?.metrics ?? []).slice(0, 8).map((m) => (
                  <Link
                    key={m.fixtureId}
                    href={`/match/${encodeURIComponent(m.fixtureId)}`}
                    className="flex justify-between border-b border-white/[0.06] py-2 font-mono-data hover:t-accent"
                  >
                    <span className="truncate pr-2">{m.matchLabel}</span>
                    <span className="t-accent font-medium">{Math.round(m.pressureScore)}</span>
                  </Link>
                ))}
              </div>
            </TerminalCard>
          </div>
        </>
      )}
    </motion.div>
  );
}
