"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, Radio, Shield, Zap } from "lucide-react";
import { useOps } from "@/hooks/useOps";
import MetricHero from "@/components/ui/MetricHero";
import ChaosRadar from "@/components/ui/ChaosRadar";
import HeatmapGrid from "@/components/ui/HeatmapGrid";
import LiveFeed from "@/components/ui/LiveFeed";
import ExecutionBar from "@/components/ui/ExecutionBar";
import ExecutionBadge from "@/components/ui/ExecutionBadge";
import GaugeArc from "@/components/ui/GaugeArc";
import { fadeUp, staggerContainer } from "@/components/ui/motion";
import type { RiskLevel } from "@/lib/design/tokens";
import { riskStyles } from "@/lib/design/tokens";

const CommandMetrics = memo(function CommandMetrics({
  matchCount,
  avgConfidence,
  edgeCount,
  telegramStatus,
}: {
  matchCount: number;
  avgConfidence: number;
  edgeCount: number;
  telegramStatus: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricHero
        label="Institutional confidence"
        value={`${Math.round(avgConfidence)}`}
        sub="Meta consensus avg"
        accent
        icon={<Shield className="h-4 w-4 text-pressure/70" />}
      />
      <MetricHero
        label="Live fixtures"
        value={String(matchCount)}
        sub="Pressure runtime"
        icon={<Radio className="h-4 w-4 text-muted" />}
      />
      <MetricHero
        label="Market edges"
        value={String(edgeCount)}
        sub="Calibrated live"
        icon={<Activity className="h-4 w-4 text-muted" />}
      />
      <MetricHero
        label="Telegram"
        value={telegramStatus}
        sub="Dispatch channel"
        icon={<Zap className="h-4 w-4 text-muted" />}
      />
    </div>
  );
});

function RiskPill({ level }: { level: RiskLevel | string }) {
  const key = (level in riskStyles ? level : "SAFE") as RiskLevel;
  const s = riskStyles[key];
  return (
    <span
      className="rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wider"
      style={{ background: s.bg, color: s.text, borderColor: s.border }}
    >
      {level}
    </span>
  );
}

export default function CommandCenter() {
  const {
    livePressure,
    metaConsensus,
    marketCalibration,
    temporal,
    sequenceMemory,
    microevent,
    signalDecision,
    apiUsage,
    validation,
    telegram,
    recentDispatches,
    logs,
    status,
    lastUpdated,
  } = useOps();

  const avgConfidence = metaConsensus?.averageInstitutionalConfidence ?? 0;
  const chaosLevel =
    sequenceMemory?.sustainedChaos[0]?.sustainedChaosLevel ??
    microevent?.chaosBursts[0]?.microeventScore ??
    42;

  const executionFeed = useMemo(
    () =>
      (metaConsensus?.topExecutions ?? []).map((e) => ({
        id: e.fixtureId,
        primary: e.matchLabel ?? e.fixtureId,
        secondary: `${e.executionDecision} · consensus ${e.consensusScore}`,
        meta: `Grade ${e.executionGrade}`,
        grade: e.executionGrade,
        accent: e.executionDecision.includes("EXECUTE"),
      })),
    [metaConsensus?.topExecutions]
  );

  const edgeRanking = useMemo(
    () =>
      [...(marketCalibration?.topEdges ?? [])]
        .sort((a, b) => b.edgePercent - a.edgePercent)
        .slice(0, 8)
        .map((e) => ({
          id: e.fixtureId,
          primary: e.matchLabel ?? e.fixtureId,
          secondary: `${e.market} · EV ${(e.expectedValue * 100).toFixed(1)}%`,
          meta: `Edge ${e.edgePercent.toFixed(1)}%`,
          accent: e.edgePercent > 5,
        })),
    [marketCalibration?.topEdges]
  );

  const dominantEngines = metaConsensus?.dominantEnginesSummary ?? [];

  const pressureCards = useMemo(
    () =>
      [...(livePressure?.metrics ?? [])]
        .sort((a, b) => b.pressureScore - a.pressureScore)
        .slice(0, 6),
    [livePressure?.metrics]
  );

  const triggerPhases = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of temporal?.chaosMap ?? []) {
      const phase = c.matchPhase ?? "MID";
      map.set(phase, (map.get(phase) ?? 0) + 1);
    }
    if (map.size === 0) {
      return [
        { label: "EARLY", value: 35 },
        { label: "MID", value: 55 },
        { label: "LATE", value: 72 },
        { label: "STOPPAGE", value: 48 },
      ];
    }
    return [...map.entries()].map(([label, count]) => ({
      label,
      value: Math.min(100, count * 18),
    }));
  }, [temporal?.chaosMap]);

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show">
      <motion.div variants={fadeUp} className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="gp-label flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-pressure animate-live-blink" />
            Live Command Center
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted">
            {status === "live" ? "SYNC" : status.toUpperCase()}
            {lastUpdated
              ? ` · ${new Date(lastUpdated).toLocaleTimeString()}`
              : ""}
          </p>
        </div>
        <RiskPill level={(apiUsage?.alertLevel as RiskLevel) ?? "SAFE"} />
      </motion.div>

      <motion.div variants={fadeUp} className="mb-8">
        <CommandMetrics
          matchCount={livePressure?.matchCount ?? 0}
          avgConfidence={avgConfidence}
          edgeCount={marketCalibration?.topEdges.length ?? 0}
          telegramStatus={telegram?.status ?? "—"}
        />
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <motion.div variants={fadeUp} className="xl:col-span-4 space-y-6">
          <div className="gp-card gp-glow p-6">
            <p className="gp-label mb-4">Chaos radar</p>
            <ChaosRadar level={chaosLevel} />
          </div>
          <div className="gp-card p-5">
            <p className="gp-label mb-4">Institutional confidence</p>
            <GaugeArc
              value={avgConfidence}
              label="Consensus"
              color="#3ee8ff"
            />
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="xl:col-span-5">
          <LiveFeed items={executionFeed} title="Execution feed" />
        </motion.div>

        <motion.div variants={fadeUp} className="xl:col-span-3 space-y-6">
          <LiveFeed
            items={edgeRanking}
            title="Live edge ranking"
            empty="No calibrated edges"
          />
        </motion.div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
        <motion.div variants={fadeUp} className="gp-card p-5 xl:col-span-1">
          <p className="gp-label mb-4">Market drift</p>
          <div className="space-y-3 max-h-[240px] overflow-y-auto gp-scrollbar">
            {(marketCalibration?.topEdges ?? []).slice(0, 6).map((e) => (
              <div key={`${e.fixtureId}-${e.market}`} className="border-b border-white/5 pb-2">
                <p className="font-mono text-[11px] truncate">{e.matchLabel ?? e.fixtureId}</p>
                <ExecutionBar value={Math.min(100, e.edgePercent * 8)} label={e.market} />
              </div>
            ))}
            {(marketCalibration?.topEdges ?? []).length === 0 && (
              <p className="text-[11px] text-muted">No drift data</p>
            )}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="gp-card p-5">
          <p className="gp-label mb-4">Trigger windows</p>
          <div className="space-y-3">
            {triggerPhases.map((p) => (
              <ExecutionBar
                key={p.label}
                value={p.value}
                label={p.label}
                color="#a78bfa"
              />
            ))}
          </div>
        </motion.div>

        <motion.div variants={fadeUp} className="gp-card p-5">
          <p className="gp-label mb-4">Dominant engines</p>
          <div className="flex flex-wrap gap-2">
            {dominantEngines.length === 0 ? (
              <p className="text-[11px] text-muted">—</p>
            ) : (
              dominantEngines.map((e) => (
                <span
                  key={e.engine}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 font-mono text-[10px]"
                >
                  {e.engine}{" "}
                  <span className="text-pressure">{Math.round(e.weight)}</span>
                </span>
              ))
            )}
          </div>
          {validation && (
            <p className="mt-4 font-mono text-[10px] text-muted">
              Validation hit {(validation.hitRate * 100).toFixed(0)}% ·{" "}
              {validation.suggestionCount} calibrations
            </p>
          )}
        </motion.div>
      </div>

      <motion.div variants={fadeUp} className="mt-6 gp-card p-5">
        <p className="gp-label mb-4">Request heatmap · API usage</p>
        <HeatmapGrid cells={apiUsage?.requestHeatmap ?? []} />
      </motion.div>

      <motion.div variants={fadeUp} className="mt-6">
        <p className="gp-label mb-4">Live pressure — command tiles</p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pressureCards.map((m) => {
            const fixtureId = m.fixtureId;
            const matchId = `sm-${fixtureId}`;
            return (
              <Link
                key={fixtureId}
                href={`/live/${encodeURIComponent(matchId)}`}
                className="gp-card gp-glow block p-5 transition hover:-translate-y-0.5"
              >
                <div className="flex justify-between gap-2">
                  <p className="font-sans font-medium truncate">{m.matchLabel}</p>
                  <ExecutionBadge
                    grade={
                      m.pressureScore >= 80
                        ? "S"
                        : m.pressureScore >= 65
                          ? "A"
                          : "B"
                    }
                    size="sm"
                  />
                </div>
                <p className="mt-2 font-mono text-[10px] text-muted">
                  {m.minute}&apos; · Momentum {Math.round(m.momentum)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="gp-label">Pressure</p>
                    <p className="font-mono text-lg font-bold text-pressure">
                      {Math.round(m.pressureScore)}
                    </p>
                  </div>
                  <div>
                    <p className="gp-label">Goal %</p>
                    <p className="font-mono text-lg font-bold">
                      {Math.round(m.goalProbability)}
                    </p>
                  </div>
                  <div>
                    <p className="gp-label">Conf</p>
                    <p className="font-mono text-lg font-bold">
                      {Math.round(m.confidence)}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </motion.div>

      {(recentDispatches.length > 0 || logs.length > 0) && (
        <motion.div variants={fadeUp} className="mt-6 gp-card p-4">
          <p className="gp-label mb-2">Recent dispatch log</p>
          <p className="font-mono text-[10px] text-muted truncate">
            {logs[0]?.message ?? recentDispatches[0]?.signalId ?? "—"}
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
