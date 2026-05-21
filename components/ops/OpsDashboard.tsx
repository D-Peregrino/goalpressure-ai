"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Ban,
  Copy,
  Gauge,
  Radio,
  Send,
  Shield,
  Target,
  Terminal,
  Zap,
} from "lucide-react";
import type { OpsActiveSignal, OpsLivePressureMetric } from "@/types/opsApi";
import EngineTelemetryStrip from "@/components/engine/EngineTelemetryStrip";
import { useEngineInsights } from "@/hooks/useEngineInsights";
import { useOps } from "@/hooks/useOps";
import { getMarketLabel } from "@/types/domain";
import type { OpsDispatchRecord, OpsLogEntry } from "@/types/opsApi";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}

function KpiCard({ label, value, sub, accent }: KpiCardProps) {
  return (
    <div
      className={`corner-brackets module-panel scanline-overlay relative p-4 ${
        accent ? "glow-red border-pressure/30" : ""
      }`}
    >
      <p className="telemetry-label">{label}</p>
      <p
        className={`mt-2 font-mono text-xl font-bold tabular-nums sm:text-2xl ${
          accent ? "text-pressure" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-muted">
          {sub}
        </p>
      )}
    </div>
  );
}

function statusBadge(status: OpsDispatchRecord["status"]): string {
  switch (status) {
    case "dispatched":
      return "border-pressure/50 bg-pressure/10 text-pressure";
    case "sandbox":
      return "border-amber-500/40 bg-amber-500/10 text-amber-400";
    case "failed":
      return "border-red-500/40 bg-red-500/10 text-red-400";
    case "cooldown":
      return "border-card bg-surface text-muted";
    case "skipped":
      return "border-card bg-surface text-muted";
    default:
      return "border-card/80 text-muted";
  }
}

function LivePressureTerminal({
  snapshot,
}: {
  snapshot: { metrics: OpsLivePressureMetric[]; topPressure: OpsLivePressureMetric | null; updatedAt: string | null };
}) {
  const { metrics, topPressure, updatedAt } = snapshot;

  return (
    <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
      <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
        <Gauge className="h-3.5 w-3.5 text-pressure" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
          Live Pressure Metrics
        </span>
        {updatedAt && (
          <span className="ml-auto font-mono text-[9px] text-muted">
            {formatTime(updatedAt)}
          </span>
        )}
      </div>
      <div className="max-h-[280px] overflow-y-auto p-3 font-mono text-[10px] leading-relaxed">
        {topPressure && (
          <p className="mb-2 text-pressure">
            [top] {topPressure.matchLabel} {topPressure.minute}&apos; P=
            {topPressure.pressureScore} H={topPressure.homePressure} A=
            {topPressure.awayPressure} M={topPressure.momentum}
          </p>
        )}
        {metrics.length === 0 ? (
          <p className="text-muted">[pressure] awaiting runtime cycle…</p>
        ) : (
          metrics.slice(0, 12).map((m) => (
            <div
              key={m.fixtureId}
              className="mb-1 border-l-2 border-pressure/30 pl-2 text-foreground/85"
            >
              {m.matchLabel} {m.minute}&apos; | P={m.pressureScore} H=
              {m.homePressure} A={m.awayPressure} M={m.momentum} GP=
              {(m.goalProbability * 100).toFixed(0)}% conf=
              {(m.confidence * 100).toFixed(0)}%
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function OpsLogTerminal({ logs }: { logs: OpsLogEntry[] }) {
  return (
    <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
      <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
        <Terminal className="h-3.5 w-3.5 text-pressure" />
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
          Dispatch Log Stream
        </span>
      </div>
      <div className="max-h-[320px] overflow-y-auto p-3 font-mono text-[10px] leading-relaxed">
        {logs.length === 0 ? (
          <p className="text-muted">[ops] awaiting dispatch events…</p>
        ) : (
          logs.map((entry) => (
            <div
              key={entry.id}
              className={`mb-1.5 border-l-2 pl-2 ${
                entry.level === "error"
                  ? "border-red-500 text-red-400"
                  : entry.level === "warn"
                    ? "border-amber-500 text-amber-400/90"
                    : "border-pressure/40 text-foreground/85"
              }`}
            >
              <span className="text-muted">[{formatTime(entry.timestamp)}]</span>{" "}
              <span className="text-pressure/80">{entry.event}</span>{" "}
              <span>{entry.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function OpsDashboard() {
  const {
    telegram,
    queue,
    counters,
    recentDispatches,
    logs,
    livePressure,
    signalDecision,
    backtest,
    marketCalibration,
    temporal,
    playerImpact,
    microevent,
    sequenceMemory,
    metaConsensus,
    dataQuality,
    autoDispatch,
    validation,
    apiUsage,
    status,
    error,
    lastUpdated,
    responseTime,
    isInitialLoad,
  } = useOps();
  const {
    engine,
    dispatchQueueSize,
    loading: engineLoading,
  } = useEngineInsights();

  const feedLabel =
    status === "loading" && isInitialLoad
      ? "SYNC"
      : status === "error"
        ? "ERROR"
        : "LIVE";

  const telegramLabel = useMemo(() => {
    if (!telegram) return "—";
    return telegram.status;
  }, [telegram]);

  return (
    <>
      <header className="mb-5 border-b border-card/80 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.35em] text-muted">
              Signal Distribution Command
            </p>
            <h1 className="mt-1 font-mono text-xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-2xl lg:text-[1.65rem]">
              Operations Terminal
            </h1>
            <p className="mt-2 max-w-2xl font-mono text-[10px] leading-relaxed text-muted">
              Telegram live dispatch · 5 min cooldown · dedup · Supabase
              dispatch_logs · real send when sandbox off
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-pressure animate-live-blink" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pressure">
              Ops Stream
            </span>
          </div>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-2 border border-card bg-surface/60 p-3 sm:grid-cols-4 lg:grid-cols-6">
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Feed</p>
          <p className="telemetry-value uppercase">{feedLabel}</p>
        </div>
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Sandbox</p>
          <p className="telemetry-value text-pressure">
            {telegram?.sandboxMode ? "ON" : "OFF"}
          </p>
        </div>
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Telegram</p>
          <p className="telemetry-value">{telegramLabel}</p>
        </div>
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Processing</p>
          <p className="telemetry-value">
            {queue?.processing ? "YES" : "NO"}
          </p>
        </div>
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Cooldown Keys</p>
          <p className="telemetry-value tabular-nums">
            {queue?.cooldownEntries ?? 0}
          </p>
        </div>
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">API Latency</p>
          <p className="telemetry-value tabular-nums">
            {responseTime != null ? `${responseTime}ms` : "—"}
          </p>
        </div>
        {error && (
          <div className="col-span-full border border-pressure/40 bg-pressure/5 px-3 py-2">
            <p className="font-mono text-[10px] text-pressure">{error}</p>
          </div>
        )}
      </div>

      <EngineTelemetryStrip
        engine={engine}
        loading={engineLoading}
        dispatchQueueSize={dispatchQueueSize}
      />

      {isInitialLoad && status === "loading" ? (
        <div className="module-panel flex min-h-[200px] items-center justify-center p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted animate-pulse-glow">
            Loading ops telemetry…
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="section-header mb-4">Dispatch Telemetry</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <KpiCard
                label="Queue Size"
                value={String(queue?.queueSize ?? 0)}
                sub={queue?.processing ? "Processing" : "Idle"}
                accent={(queue?.queueSize ?? 0) > 0}
              />
              <KpiCard
                label="Dispatch Rate"
                value={`${counters?.dispatchRatePerMin ?? 0}/min`}
                sub={`${counters?.totalDispatched ?? 0} total`}
              />
              <KpiCard
                label="Telegram"
                value={
                  telegram?.status === "ONLINE"
                    ? "ONLINE"
                    : telegram?.status ?? "OFFLINE"
                }
                sub={
                  telegram?.sandboxMode
                    ? "Sandbox mode"
                    : telegram?.connected
                      ? "Real send active"
                      : "Not connected"
                }
                accent={telegram?.status === "ONLINE"}
              />
              <KpiCard
                label="Total Dispatches"
                value={String(telegram?.totalSent ?? counters?.totalDispatched ?? 0)}
                sub={`${telegram?.totalFailed ?? counters?.sendFailed ?? 0} failed`}
              />
              <KpiCard
                label="Avg Latency"
                value={
                  (telegram?.averageLatencyMs ?? counters?.averageLatencyMs ?? 0) > 0
                    ? `${telegram?.averageLatencyMs ?? counters?.averageLatencyMs}ms`
                    : "—"
                }
                sub={
                  telegram?.lastDispatch
                    ? new Date(telegram.lastDispatch).toLocaleTimeString()
                    : "No dispatch yet"
                }
              />
              <KpiCard
                label="Fail Rate"
                value={formatPercent(counters?.failRate ?? 0)}
                sub={`${counters?.sendFailed ?? 0} failures`}
              />
              <KpiCard
                label="Duplicate Blocks"
                value={String(
                  (counters?.duplicateSkips ?? 0) +
                    (counters?.cooldownBlocked ?? 0)
                )}
                sub={`${counters?.duplicateSkips ?? 0} dup · ${counters?.cooldownBlocked ?? 0} cd`}
              />
            </div>
          </section>

          <section>
            <h2 className="section-header mb-4">Institutional Backtest</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
              <KpiCard
                label="ROI (hist.)"
                value={
                  backtest && backtest.totalSignals > 0
                    ? `${(backtest.roi * 100).toFixed(1)}%`
                    : "—"
                }
                sub={`${backtest?.totalSignals ?? 0} signals`}
                accent={Boolean(backtest && backtest.roi > 0)}
              />
              <KpiCard
                label="Hit Rate"
                value={
                  backtest && backtest.totalSignals > 0
                    ? `${(backtest.hitRate * 100).toFixed(1)}%`
                    : "—"
                }
                sub={`${backtest?.wins ?? 0}W / ${backtest?.losses ?? 0}L`}
              />
              <KpiCard
                label="Win Streak"
                value={String(backtest?.winStreak ?? 0)}
                sub="current"
              />
              <KpiCard
                label="Lose Streak"
                value={String(backtest?.loseStreak ?? 0)}
                sub="current"
              />
              <KpiCard
                label="Realized EV"
                value={
                  backtest && backtest.averageEv !== 0
                    ? backtest.averageEv.toFixed(3)
                    : "—"
                }
                sub="avg per trade"
              />
              <KpiCard
                label="Max Drawdown"
                value={
                  backtest ? backtest.maxDrawdown.toFixed(2) : "—"
                }
                sub={`P&L ${backtest?.profitUnits?.toFixed(2) ?? "0"}u`}
              />
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              Run via{" "}
              <code className="text-foreground">GET /api/backtest/run</code> ·
              Results{" "}
              <code className="text-foreground">GET /api/backtest/results</code>
              {backtest?.updatedAt
                ? ` · last ${formatTime(backtest.updatedAt)}`
                : " · no run yet"}
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">Temporal Dynamics Engine</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
              <KpiCard
                label="Avg Chaos"
                value={
                  temporal && temporal.matchCount > 0
                    ? String(temporal.averageChaos)
                    : "—"
                }
                sub="chaos map index"
                accent={Boolean(temporal && temporal.averageChaos >= 55)}
              />
              <KpiCard
                label="Acceleration"
                value={
                  temporal ? String(temporal.averageAcceleration) : "—"
                }
              />
              <KpiCard
                label="Urgency"
                value={
                  temporal ? temporal.averageUrgency.toFixed(2) : "—"
                }
                sub="multiplier avg"
              />
              <KpiCard
                label="Volatility"
                value={
                  temporal ? String(temporal.averageVolatility) : "—"
                }
              />
              <KpiCard
                label="Critical"
                value={String(temporal?.criticalCount ?? 0)}
                sub={`${temporal?.highPriorityCount ?? 0} HIGH`}
                accent={(temporal?.criticalCount ?? 0) > 0}
              />
              <KpiCard
                label="Execution"
                value={
                  temporal?.chaosMap[0]?.executionPriority ?? "—"
                }
                sub={
                  temporal?.chaosMap[0]
                    ? `${temporal.chaosMap[0].matchPhase} ${temporal.chaosMap[0].minute}'`
                    : "top fixture"
                }
              />
            </div>
            <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d] mb-6">
              <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                  Chaos Map
                </span>
              </div>
              <div className="max-h-[220px] overflow-y-auto p-3 font-mono text-[10px]">
                {(temporal?.chaosMap ?? []).length === 0 ? (
                  <p className="text-muted">[temporal-dynamics] awaiting cycle…</p>
                ) : (
                  temporal?.chaosMap.map((e) => (
                    <div
                      key={e.fixtureId}
                      className={`mb-1 border-l-2 pl-2 ${
                        e.executionPriority === "CRITICAL"
                          ? "border-red-500 text-red-400"
                          : e.executionPriority === "HIGH"
                            ? "border-pressure text-pressure"
                            : "border-card text-foreground/80"
                      }`}
                    >
                      {e.matchLabel ?? e.fixtureId} · {e.minute}&apos; ·{" "}
                      {e.matchPhase} · chaos {e.chaosIndex} · {e.executionPriority}
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              API{" "}
              <code className="text-foreground">GET /api/temporal/live</code>
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">Player Impact Engine</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-4">
              <KpiCard
                label="Clutch"
                value={
                  playerImpact?.topClutchPlayers[0]
                    ? String(playerImpact.topClutchPlayers[0].clutchFactor)
                    : "—"
                }
                sub={playerImpact?.topClutchPlayers[0]?.name ?? "top player"}
                accent={Boolean(
                  playerImpact &&
                    (playerImpact.topClutchPlayers[0]?.clutchFactor ?? 0) >= 70
                )}
              />
              <KpiCard
                label="Fatigue Alerts"
                value={String(playerImpact?.fatigueAlerts.length ?? 0)}
                sub="extreme fatigue"
                accent={(playerImpact?.fatigueAlerts.length ?? 0) > 0}
              />
              <KpiCard
                label="GK Resistance"
                value={
                  playerImpact?.goalkeeperResistance[0]
                    ? String(playerImpact.goalkeeperResistance[0].value)
                    : "—"
                }
                sub={
                  playerImpact?.goalkeeperResistance[0]?.matchLabel ?? "hot GK"
                }
              />
              <KpiCard
                label="Sub Swing"
                value={
                  playerImpact?.substitutionImpacts[0]
                    ? `${playerImpact.substitutionImpacts[0].swing > 0 ? "+" : ""}${playerImpact.substitutionImpacts[0].swing}`
                    : "—"
                }
                sub="substitution impact"
              />
              <KpiCard
                label="Chaos"
                value={
                  playerImpact?.chaosContributors[0]
                    ? String(playerImpact.chaosContributors[0].chaos)
                    : "—"
                }
                sub={playerImpact?.chaosContributors[0]?.name ?? "contributor"}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 mb-6">
              <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
                <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                    Clutch Players
                  </span>
                </div>
                <div className="max-h-[180px] overflow-y-auto p-3 font-mono text-[10px]">
                  {(playerImpact?.topClutchPlayers ?? []).length === 0 ? (
                    <p className="text-muted">[player-impact] awaiting cycle…</p>
                  ) : (
                    playerImpact?.topClutchPlayers.map((p) => (
                      <div key={p.fixtureId} className="mb-1 border-l-2 border-pressure pl-2">
                        {p.name} · {p.fixtureId} · clutch {p.clutchFactor}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
                <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                    Fatigue · Sub · Chaos
                  </span>
                </div>
                <div className="max-h-[180px] overflow-y-auto p-3 font-mono text-[10px]">
                  {(playerImpact?.fatigueAlerts ?? []).map((f) => (
                    <div
                      key={`fat-${f.fixtureId}`}
                      className="mb-1 border-l-2 border-amber-500 pl-2 text-amber-400"
                    >
                      FATIGUE {f.name} · {f.fatigueImpact}
                    </div>
                  ))}
                  {(playerImpact?.substitutionImpacts ?? []).slice(0, 4).map((s) => (
                    <div
                      key={`sub-${s.fixtureId}`}
                      className="mb-1 border-l-2 border-card pl-2"
                    >
                      SUB {s.matchLabel ?? s.fixtureId} · swing {s.swing}
                    </div>
                  ))}
                  {(playerImpact?.chaosContributors ?? []).slice(0, 4).map((c) => (
                    <div
                      key={`chaos-${c.fixtureId}`}
                      className="mb-1 border-l-2 border-red-500/60 pl-2"
                    >
                      CHAOS {c.name} · {c.chaos}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              API{" "}
              <code className="text-foreground">GET /api/player/runtime</code>
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">Microevent Detection Engine</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
              <KpiCard
                label="Microevent Score"
                value={
                  microevent && microevent.matchCount > 0
                    ? String(microevent.averageMicroeventScore)
                    : "—"
                }
                sub="avg pre-goal index"
                accent={Boolean(
                  microevent && microevent.averageMicroeventScore >= 60
                )}
              />
              <KpiCard
                label="Chaos Burst"
                value={
                  microevent?.chaosBursts[0]
                    ? String(microevent.chaosBursts[0].chaosBurst)
                    : "—"
                }
                sub={microevent?.chaosBursts[0]?.matchLabel ?? "top fixture"}
              />
              <KpiCard
                label="Territorial"
                value={
                  microevent?.territorialPressure[0]
                    ? String(microevent.territorialPressure[0].territorialDominance)
                    : "—"
                }
                sub="dominance index"
              />
              <KpiCard
                label="Attack Waves"
                value={
                  microevent?.attackWaves[0]
                    ? String(microevent.attackWaves[0].attackWaveIntensity)
                    : "—"
                }
                sub={microevent?.attackWaves[0]?.matchLabel ?? "—"}
              />
              <KpiCard
                label="Collapse"
                value={String(microevent?.collapseAlerts.length ?? 0)}
                sub="defensive alerts"
                accent={(microevent?.collapseAlerts.length ?? 0) > 0}
              />
              <KpiCard
                label="Trigger Window"
                value={
                  microevent?.topTriggerWindows[0]?.triggerWindow ?? "—"
                }
                sub={
                  microevent?.topTriggerWindows[0]
                    ? `score ${microevent.topTriggerWindows[0].microeventScore}`
                    : "top fixture"
                }
                accent={
                  microevent?.topTriggerWindows[0]?.triggerWindow === "30s" ||
                  microevent?.topTriggerWindows[0]?.triggerWindow === "60s"
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 mb-6">
              <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
                <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                    Chaos · Waves · Territorial
                  </span>
                </div>
                <div className="max-h-[180px] overflow-y-auto p-3 font-mono text-[10px]">
                  {(microevent?.chaosBursts ?? []).length === 0 ? (
                    <p className="text-muted">[microevent-engine] awaiting cycle…</p>
                  ) : (
                    <>
                      {microevent?.chaosBursts.slice(0, 4).map((e) => (
                        <div
                          key={`chaos-${e.fixtureId}`}
                          className="mb-1 border-l-2 border-red-500/70 pl-2 text-red-400"
                        >
                          CHAOS {e.matchLabel ?? e.fixtureId} · burst {e.chaosBurst}{" "}
                          · score {e.microeventScore}
                        </div>
                      ))}
                      {microevent?.attackWaves.slice(0, 3).map((e) => (
                        <div
                          key={`wave-${e.fixtureId}`}
                          className="mb-1 border-l-2 border-pressure pl-2"
                        >
                          WAVE {e.matchLabel ?? e.fixtureId} · {e.attackWaveIntensity}
                        </div>
                      ))}
                      {microevent?.territorialPressure.slice(0, 2).map((e) => (
                        <div
                          key={`terr-${e.fixtureId}`}
                          className="mb-1 border-l-2 border-card pl-2 text-muted"
                        >
                          TERR {e.matchLabel ?? e.fixtureId} · {e.territorialDominance}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
                <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                    Collapse · Tilt · Windows
                  </span>
                </div>
                <div className="max-h-[180px] overflow-y-auto p-3 font-mono text-[10px]">
                  {(microevent?.collapseAlerts ?? []).map((e) => (
                    <div
                      key={`col-${e.fixtureId}`}
                      className="mb-1 border-l-2 border-amber-500 pl-2 text-amber-400"
                    >
                      COLLAPSE {e.matchLabel ?? e.fixtureId} · {e.collapseProbability}%
                    </div>
                  ))}
                  {(microevent?.emotionalTilt ?? []).slice(0, 3).map((e) => (
                    <div
                      key={`tilt-${e.fixtureId}`}
                      className="mb-1 border-l-2 border-purple-500/60 pl-2"
                    >
                      TILT {e.matchLabel ?? e.fixtureId} · {e.emotionalTilt}
                    </div>
                  ))}
                  {(microevent?.topTriggerWindows ?? []).slice(0, 5).map((e) => (
                    <div
                      key={`win-${e.fixtureId}`}
                      className="mb-1 border-l-2 border-pressure pl-2"
                    >
                      WINDOW {e.triggerWindow} · {e.matchLabel ?? e.fixtureId} ·{" "}
                      score {e.microeventScore}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              API{" "}
              <code className="text-foreground">GET /api/microevent/live</code>
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">Sequence Memory Engine</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
              <KpiCard
                label="Recurrence"
                value={
                  sequenceMemory && sequenceMemory.matchCount > 0
                    ? String(sequenceMemory.averageRecurrenceScore)
                    : "—"
                }
                sub="avg pattern score"
                accent={Boolean(
                  sequenceMemory && sequenceMemory.averageRecurrenceScore >= 55
                )}
              />
              <KpiCard
                label="State"
                value={
                  sequenceMemory?.recurrenceLeaders[0]?.sequenceState ?? "—"
                }
                sub={sequenceMemory?.recurrenceLeaders[0]?.matchLabel ?? "top"}
              />
              <KpiCard
                label="Offensive Cycles"
                value={
                  sequenceMemory?.offensiveCycles[0]
                    ? String(sequenceMemory.offensiveCycles[0].offensiveCycleStrength)
                    : "—"
                }
                sub="cycle strength"
              />
              <KpiCard
                label="Fake Momentum"
                value={String(sequenceMemory?.fakeMomentumAlerts.length ?? 0)}
                sub="alerts"
                accent={(sequenceMemory?.fakeMomentumAlerts.length ?? 0) > 0}
              />
              <KpiCard
                label="Collapse Cycles"
                value={String(sequenceMemory?.collapseCycles.length ?? 0)}
                sub="repeated collapse"
                accent={(sequenceMemory?.collapseCycles.length ?? 0) > 0}
              />
              <KpiCard
                label="Sustained Chaos"
                value={
                  sequenceMemory?.sustainedChaos[0]
                    ? String(sequenceMemory.sustainedChaos[0].sustainedChaosLevel)
                    : "—"
                }
                sub={sequenceMemory?.sustainedChaos[0]?.sequenceState ?? "—"}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 mb-6">
              <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
                <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                    Recurrence · Cycles · Dominance
                  </span>
                </div>
                <div className="max-h-[180px] overflow-y-auto p-3 font-mono text-[10px]">
                  {(sequenceMemory?.recurrenceLeaders ?? []).length === 0 ? (
                    <p className="text-muted">[sequence-memory] awaiting cycle…</p>
                  ) : (
                    <>
                      {sequenceMemory?.recurrenceLeaders.slice(0, 4).map((e) => (
                        <div
                          key={`rec-${e.fixtureId}`}
                          className="mb-1 border-l-2 border-pressure pl-2"
                        >
                          REC {e.matchLabel ?? e.fixtureId} · {e.recurrenceScore} ·{" "}
                          {e.sequenceState}
                        </div>
                      ))}
                      {sequenceMemory?.offensiveCycles.slice(0, 3).map((e) => (
                        <div
                          key={`cyc-${e.fixtureId}`}
                          className="mb-1 border-l-2 border-card pl-2"
                        >
                          CYCLE {e.matchLabel ?? e.fixtureId} · {e.offensiveCycleStrength}
                        </div>
                      ))}
                      {sequenceMemory?.dominanceCurves.slice(0, 2).map((e) => (
                        <div
                          key={`dom-${e.fixtureId}`}
                          className="mb-1 border-l-2 border-emerald-500/50 pl-2 text-emerald-400"
                        >
                          LATE {e.matchLabel ?? e.fixtureId} · {e.lateGameDominance}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
              <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
                <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                    Fake Mom · Collapse · Chaos
                  </span>
                </div>
                <div className="max-h-[180px] overflow-y-auto p-3 font-mono text-[10px]">
                  {(sequenceMemory?.fakeMomentumAlerts ?? []).map((e) => (
                    <div
                      key={`fake-${e.fixtureId}`}
                      className="mb-1 border-l-2 border-amber-500 pl-2 text-amber-400"
                    >
                      FAKE {e.matchLabel ?? e.fixtureId} · {e.fakeMomentumProbability}
                    </div>
                  ))}
                  {(sequenceMemory?.collapseCycles ?? []).map((e) => (
                    <div
                      key={`col-${e.fixtureId}`}
                      className="mb-1 border-l-2 border-red-500/70 pl-2 text-red-400"
                    >
                      COLLAPSE {e.matchLabel ?? e.fixtureId} · {e.collapseCycleProbability}
                    </div>
                  ))}
                  {(sequenceMemory?.sustainedChaos ?? []).slice(0, 4).map((e) => (
                    <div
                      key={`sch-${e.fixtureId}`}
                      className="mb-1 border-l-2 border-purple-500/60 pl-2"
                    >
                      CHAOS {e.matchLabel ?? e.fixtureId} · {e.sustainedChaosLevel} ·{" "}
                      {e.sequenceState}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              API{" "}
              <code className="text-foreground">GET /api/sequence/live</code>
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">Operational Intelligence Layer</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
              <KpiCard
                label="Data Quality"
                value={
                  dataQuality && dataQuality.matchCount > 0
                    ? String(dataQuality.averageScore)
                    : "—"
                }
                sub={`${dataQuality?.unreliableCount ?? 0} unreliable`}
                accent={Boolean(dataQuality && dataQuality.averageScore >= 60)}
              />
              <KpiCard
                label="Not Usable"
                value={String(dataQuality?.notUsableForSignal.length ?? 0)}
                sub="signal blocked"
                accent={(dataQuality?.notUsableForSignal.length ?? 0) > 0}
              />
              <KpiCard
                label="Auto Dispatch"
                value={autoDispatch?.status ?? "—"}
                sub={`sent ${autoDispatch?.lastDispatched ?? 0} · blk ${autoDispatch?.lastBlocked ?? 0}`}
                accent={autoDispatch?.status === "ACTIVE"}
              />
              <KpiCard
                label="Stale Alerts"
                value={String(dataQuality?.staleAlerts.length ?? 0)}
              />
              <KpiCard
                label="FP Risk"
                value={
                  metaConsensus?.falsePositiveAlerts[0]
                    ? String(metaConsensus.falsePositiveAlerts[0].falsePositiveRisk)
                    : "—"
                }
              />
              <KpiCard
                label="Executions"
                value={String(metaConsensus?.topExecutions.length ?? 0)}
                sub="meta approved"
              />
              <KpiCard
                label="Validation"
                value={
                  validation && validation.tradeCount > 0
                    ? `${(validation.hitRate * 100).toFixed(0)}%`
                    : "—"
                }
                sub={`${validation?.suggestionCount ?? 0} calibrations`}
                accent={Boolean(validation && validation.roi > 0)}
              />
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              APIs{" "}
              <code className="text-foreground">/api/data-quality/live</code> ·{" "}
              <code className="text-foreground">/api/meta/live</code> ·{" "}
              <code className="text-foreground">/api/validation/live</code> · Telegram: EXECUTE only
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">SportMonks API Usage Monitor</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
              <KpiCard
                label="Alert"
                value={apiUsage?.alertLevel ?? "—"}
                accent={
                  apiUsage?.alertLevel === "CRITICAL" ||
                  apiUsage?.alertLevel === "SATURATED"
                }
              />
              <KpiCard
                label="Req / min"
                value={String(apiUsage?.requestsPerMinute ?? 0)}
                sub={`${apiUsage?.requestsPerHour ?? 0}/h`}
              />
              <KpiCard
                label="Month Proj."
                value={String(apiUsage?.requestsMonthProjection ?? 0)}
                sub={`quota ${apiUsage?.monthlyQuota ?? 0}`}
                accent={(apiUsage?.quotaUtilizationPercent ?? 0) >= 80}
              />
              <KpiCard
                label="Quota Risk"
                value={`${(apiUsage?.quotaUtilizationPercent ?? 0).toFixed(0)}%`}
                sub={
                  apiUsage?.estimatedRemainingQuota != null
                    ? `${apiUsage.estimatedRemainingQuota} left`
                    : "remaining n/a"
                }
              />
              <KpiCard
                label="Plan Support"
                value={
                  apiUsage?.planSupportDays != null
                    ? `${apiUsage.planSupportDays}d`
                    : "—"
                }
                sub={
                  apiUsage?.planSupportHours != null
                    ? `${apiUsage.planSupportHours}h est.`
                    : "burn rate"
                }
                accent={Boolean(
                  apiUsage?.planSupportDays != null && apiUsage.planSupportDays < 7
                )}
              />
              <KpiCard
                label="Polling"
                value={`${((apiUsage?.averagePollingFrequencyMs ?? 0) / 1000).toFixed(0)}s`}
                sub={`${apiUsage?.activeFixtures ?? 0} fixtures`}
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-2 mb-4">
              <div className="module-panel p-4">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                  Top endpoints (24h)
                </p>
                <div className="max-h-[160px] overflow-y-auto font-mono text-[10px]">
                  {(apiUsage?.topEndpoints ?? []).length === 0 ? (
                    <p className="text-muted">—</p>
                  ) : (
                    apiUsage?.topEndpoints.map((e) => (
                      <div
                        key={e.endpoint}
                        className="mb-1 flex justify-between border-b border-card/40 py-1"
                      >
                        <span className="truncate pr-2">{e.endpoint}</span>
                        <span className="text-muted shrink-0">
                          {e.count} · {e.sharePercent}%
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="module-panel p-4">
                <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
                  Request heatmap (24h UTC hour)
                </p>
                <div className="grid grid-cols-12 gap-1">
                  {(apiUsage?.requestHeatmap ?? []).map((cell) => (
                    <div
                      key={cell.hour}
                      title={`${cell.hour}h: ${cell.count} req`}
                      className="aspect-square border border-card/60"
                      style={{
                        backgroundColor: `rgba(255, 43, 43, ${Math.max(0.08, cell.intensity / 100)})`,
                      }}
                    />
                  ))}
                </div>
                <p className="mt-2 font-mono text-[9px] text-muted">
                  cache hit {(apiUsage?.cacheHitRate ?? 0) * 100}% · live counter
                </p>
              </div>
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              API{" "}
              <code className="text-foreground">GET /api/system/api-usage</code> ·
              configure <code className="text-foreground">SPORTMONKS_MONTHLY_QUOTA</code>
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">Meta Consensus Engine</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
              <KpiCard
                label="Consensus"
                value={
                  metaConsensus && metaConsensus.matchCount > 0
                    ? String(metaConsensus.averageConsensusScore)
                    : "—"
                }
                sub="avg score"
                accent={Boolean(
                  metaConsensus && metaConsensus.averageConsensusScore >= 65
                )}
              />
              <KpiCard
                label="Inst. Confidence"
                value={
                  metaConsensus
                    ? String(metaConsensus.averageInstitutionalConfidence)
                    : "—"
                }
                sub="institutional"
              />
              <KpiCard
                label="Top Grade"
                value={
                  metaConsensus?.consensusHeatmap[0]?.executionGrade ?? "—"
                }
                sub={
                  metaConsensus?.consensusHeatmap[0]?.executionDecision ?? "—"
                }
                accent={
                  metaConsensus?.consensusHeatmap[0]?.executionGrade === "S+" ||
                  metaConsensus?.consensusHeatmap[0]?.executionGrade === "S"
                }
              />
              <KpiCard
                label="Executions"
                value={String(metaConsensus?.topExecutions.length ?? 0)}
                sub="EXECUTE + AGGRESSIVE"
                accent={(metaConsensus?.topExecutions.length ?? 0) > 0}
              />
              <KpiCard
                label="False Positive"
                value={String(metaConsensus?.falsePositiveAlerts.length ?? 0)}
                sub="risk alerts"
                accent={(metaConsensus?.falsePositiveAlerts.length ?? 0) > 0}
              />
              <KpiCard
                label="Dominant Engine"
                value={
                  metaConsensus?.dominantEnginesSummary[0]?.engine ?? "—"
                }
                sub={
                  metaConsensus?.dominantEnginesSummary[0]
                    ? `×${metaConsensus.dominantEnginesSummary[0].weight}`
                    : "leader"
                }
              />
            </div>
            <div className="grid gap-3 md:grid-cols-2 mb-4">
              <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
                <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                    Consensus Heatmap
                  </span>
                </div>
                <div className="max-h-[200px] overflow-y-auto p-3 font-mono text-[10px]">
                  {(metaConsensus?.consensusHeatmap ?? []).length === 0 ? (
                    <p className="text-muted">[meta-consensus] awaiting cycle…</p>
                  ) : (
                    metaConsensus?.consensusHeatmap.map((e) => (
                      <div
                        key={e.fixtureId}
                        className={`mb-1 border-l-2 pl-2 ${
                          e.executionGrade === "S+" || e.executionGrade === "S"
                            ? "border-pressure text-pressure"
                            : e.executionGrade === "A"
                              ? "border-emerald-500/60 text-emerald-400"
                              : "border-card text-foreground/80"
                        }`}
                      >
                        {e.matchLabel ?? e.fixtureId} · {e.consensusScore} ·{" "}
                        {e.executionGrade} · {e.executionDecision} · conf{" "}
                        {e.institutionalConfidence}
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d]">
                <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                  <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                    Grades · FP Risk · Executions
                  </span>
                </div>
                <div className="max-h-[200px] overflow-y-auto p-3 font-mono text-[10px]">
                  <div className="mb-2 flex flex-wrap gap-1">
                    {(metaConsensus?.executionGrades ?? []).map((g) => (
                      <span
                        key={g.grade}
                        className="rounded border border-card px-1.5 py-0.5 text-muted"
                      >
                        {g.grade}:{g.count}
                      </span>
                    ))}
                  </div>
                  {(metaConsensus?.falsePositiveAlerts ?? []).map((e) => (
                    <div
                      key={`fp-${e.fixtureId}`}
                      className="mb-1 border-l-2 border-amber-500 pl-2 text-amber-400"
                    >
                      FP {e.matchLabel ?? e.fixtureId} · risk {e.falsePositiveRisk}{" "}
                      · {e.executionDecision}
                    </div>
                  ))}
                  {(metaConsensus?.topExecutions ?? []).map((e) => (
                    <div
                      key={`ex-${e.fixtureId}`}
                      className="mb-1 border-l-2 border-pressure pl-2"
                    >
                      EXEC {e.matchLabel ?? e.fixtureId} · {e.executionGrade} ·{" "}
                      {e.executionDecision} · {e.consensusScore}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              API <code className="text-foreground">GET /api/meta/live</code> ·
              Telegram gated: EXECUTE / AGGRESSIVE_EXECUTE only
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">Market Calibration Engine</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mb-4">
              <KpiCard
                label="Avg Edge"
                value={
                  marketCalibration && marketCalibration.calibrated > 0
                    ? `${(marketCalibration.averageEdge * 100).toFixed(2)}%`
                    : "—"
                }
                sub={`${marketCalibration?.calibrated ?? 0} calibrated`}
                accent={Boolean(
                  marketCalibration && marketCalibration.averageEdge > 0.02
                )}
              />
              <KpiCard
                label="Strongest Edge"
                value={
                  marketCalibration?.strongestEdgePercent != null
                    ? `${marketCalibration.strongestEdgePercent.toFixed(2)}%`
                    : "—"
                }
                sub={marketCalibration?.strongestEdgeFixture ?? "—"}
              />
              <KpiCard
                label="Closing Line Eff."
                value={
                  marketCalibration
                    ? `${marketCalibration.closingLineEfficiency}%`
                    : "—"
                }
                sub="efficiency score"
              />
              <KpiCard
                label="Market Drift"
                value={
                  marketCalibration
                    ? marketCalibration.marketDrift.toFixed(3)
                    : "—"
                }
                sub="avg odd move"
              />
              <KpiCard
                label="Sharp Pressure"
                value={
                  marketCalibration
                    ? String(marketCalibration.sharpPressure)
                    : "—"
                }
                sub="P×edge align"
              />
              <KpiCard
                label="Steam Moves"
                value={String(marketCalibration?.steamMoves ?? 0)}
                sub="sharp line drops"
              />
            </div>
            <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d] mb-6">
              <div className="max-h-[200px] overflow-y-auto p-3 font-mono text-[10px] leading-relaxed">
                {(marketCalibration?.topEdges ?? []).length === 0 ? (
                  <p className="text-muted">[market-calibration] awaiting live cycle…</p>
                ) : (
                  marketCalibration?.topEdges.map((e) => (
                    <div
                      key={`${e.fixtureId}-${e.market}`}
                      className="mb-1 border-l-2 border-pressure/40 pl-2"
                    >
                      {e.matchLabel ?? e.fixtureId} · {e.market} · edge{" "}
                      {e.edgePercent.toFixed(2)}% · {e.classification} · EV{" "}
                      {e.expectedValue.toFixed(3)}
                    </div>
                  ))
                )}
              </div>
            </div>
            <p className="mb-6 font-mono text-[9px] text-muted">
              API{" "}
              <code className="text-foreground">GET /api/market/edges</code>
            </p>
          </section>

          <section>
            <h2 className="section-header mb-4">Signal Decision Engine (EV+)</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 mb-4">
              <KpiCard
                label="Active Signals"
                value={String(signalDecision?.activeSignals.length ?? 0)}
                sub={`${signalDecision?.triggered ?? 0} triggered`}
                accent={(signalDecision?.activeSignals.length ?? 0) > 0}
              />
              <KpiCard
                label="Avg EV"
                value={
                  signalDecision && signalDecision.averageEv > 0
                    ? `${(signalDecision.averageEv * 100).toFixed(1)}%`
                    : "—"
                }
                sub="EV+ opportunities"
              />
              <KpiCard
                label="Dispatched"
                value={String(signalDecision?.dispatched ?? 0)}
                sub="Telegram queue"
              />
              <KpiCard
                label="Approval Rate"
                value={
                  signalDecision
                    ? `${(signalDecision.approvalRate * 100).toFixed(0)}%`
                    : "—"
                }
                sub={`${signalDecision?.evaluated ?? 0} evaluated`}
              />
              <KpiCard
                label="Blocked"
                value={String(signalDecision?.blocked ?? 0)}
                sub="Cooldown / dedup"
              />
            </div>
            <div className="module-panel overflow-hidden border-pressure/20 bg-[#06090d] mb-6">
              <div className="flex items-center gap-2 border-b border-card/80 bg-surface/80 px-3 py-2">
                <Target className="h-3.5 w-3.5 text-pressure" />
                <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                  EV+ Active Signals
                </span>
              </div>
              <div className="max-h-[240px] overflow-y-auto p-3 font-mono text-[10px] leading-relaxed">
                {(signalDecision?.activeSignals ?? []).length === 0 ? (
                  <p className="text-muted">[live-signal] awaiting EV+ triggers…</p>
                ) : (
                  signalDecision?.activeSignals.map((s: OpsActiveSignal) => (
                    <div
                      key={`${s.fixtureId}-${s.market}`}
                      className="mb-1.5 border-l-2 border-pressure/50 pl-2"
                    >
                      <span className="text-pressure">{s.matchLabel}</span>{" "}
                      {s.minute}&apos; · {s.market} · EV+
                      {(s.ev * 100).toFixed(1)}% · P{s.pressureScore} · M
                      {s.momentum} · U{s.urgency}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="section-header mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-pressure" />
              Quantitative Pressure Engine
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5 mb-4">
              <KpiCard
                label="Live Fixtures"
                value={String(livePressure?.matchCount ?? 0)}
                sub={livePressure?.updatedAt ? "Runtime synced" : "No cycle yet"}
              />
              <KpiCard
                label="Top Pressure"
                value={
                  livePressure?.topPressure
                    ? String(livePressure.topPressure.pressureScore)
                    : "—"
                }
                sub={livePressure?.topPressure?.matchLabel ?? "—"}
                accent={Boolean(
                  livePressure?.topPressure &&
                    livePressure.topPressure.pressureScore >= 70
                )}
              />
              <KpiCard
                label="Home P (top)"
                value={
                  livePressure?.topPressure
                    ? String(livePressure.topPressure.homePressure)
                    : "—"
                }
              />
              <KpiCard
                label="Away P (top)"
                value={
                  livePressure?.topPressure
                    ? String(livePressure.topPressure.awayPressure)
                    : "—"
                }
              />
              <KpiCard
                label="Goal P (top)"
                value={
                  livePressure?.topPressure
                    ? `${(livePressure.topPressure.goalProbability * 100).toFixed(0)}%`
                    : "—"
                }
                sub={
                  livePressure?.topPressure
                    ? `M ${livePressure.topPressure.momentum}`
                    : undefined
                }
              />
            </div>
            <LivePressureTerminal
              snapshot={
                livePressure ?? {
                  metrics: [],
                  topPressure: null,
                  updatedAt: null,
                }
              }
            />
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="corner-brackets-inner module-panel glow-red p-4 sm:p-5">
              <h2 className="section-header mb-4">Recent Dispatches</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse font-mono text-[11px]">
                  <thead>
                    <tr className="border-b border-card text-left text-muted">
                      <th className="px-2 py-2 uppercase tracking-wider">
                        Signal ID
                      </th>
                      <th className="px-2 py-2 uppercase tracking-wider">
                        Model
                      </th>
                      <th className="px-2 py-2 uppercase tracking-wider">
                        Source
                      </th>
                      <th className="px-2 py-2 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-2 py-2 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-2 py-2 text-right uppercase tracking-wider">
                        Latency
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentDispatches.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-2 py-8 text-center text-muted"
                        >
                          No dispatches recorded — trigger sandbox dispatch to
                          populate
                        </td>
                      </tr>
                    ) : (
                      recentDispatches.map((row) => (
                        <tr
                          key={`${row.signalId}-${row.timestamp}`}
                          className="border-b border-card/50 hover:bg-card/20"
                        >
                          <td className="max-w-[140px] truncate px-2 py-2 text-pressure">
                            {row.signalId}
                          </td>
                          <td className="px-2 py-2">{row.modelId}</td>
                          <td className="px-2 py-2 uppercase text-muted">
                            {row.source}
                          </td>
                          <td className="px-2 py-2 tabular-nums text-muted">
                            {formatTime(row.timestamp)}
                          </td>
                          <td className="px-2 py-2">
                            <span
                              className={`inline-block border px-1.5 py-0.5 text-[9px] font-bold uppercase ${statusBadge(row.status)}`}
                            >
                              {row.status}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right tabular-nums">
                            {row.latencyMs != null ? `${row.latencyMs}ms` : "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {lastUpdated && (
                <p className="mt-3 font-mono text-[9px] uppercase tracking-widest text-muted">
                  Last sync {formatTime(new Date(lastUpdated).toISOString())}
                </p>
              )}
            </div>

            <div>
              <h2 className="section-header mb-4">Live Ops Log</h2>
              <OpsLogTerminal logs={logs} />
            </div>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="telemetry-cell flex items-center gap-2 px-3 py-3">
              <Send className="h-3 w-3 text-muted" />
              <div>
                <p className="telemetry-label">Queued</p>
                <p className="telemetry-value">{counters?.totalQueued ?? 0}</p>
              </div>
            </div>
            <div className="telemetry-cell flex items-center gap-2 px-3 py-3">
              <Shield className="h-3 w-3 text-muted" />
              <div>
                <p className="telemetry-label">Sandbox Sends</p>
                <p className="telemetry-value text-pressure">
                  {counters?.sandboxDispatches ?? 0}
                </p>
              </div>
            </div>
            <div className="telemetry-cell flex items-center gap-2 px-3 py-3">
              <Copy className="h-3 w-3 text-muted" />
              <div>
                <p className="telemetry-label">Dup Skips</p>
                <p className="telemetry-value">
                  {counters?.duplicateSkips ?? 0}
                </p>
              </div>
            </div>
            <div className="telemetry-cell flex items-center gap-2 px-3 py-3">
              <Ban className="h-3 w-3 text-muted" />
              <div>
                <p className="telemetry-label">Cooldown</p>
                <p className="telemetry-value">
                  {counters?.cooldownBlocked ?? 0}
                </p>
              </div>
            </div>
          </section>

          <section className="module-panel border-dashed border-card/60 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-pressure/80" />
              <p className="font-mono text-[10px] leading-relaxed text-muted">
                Production runtime is not connected to Telegram dispatch. Use{" "}
                <code className="text-foreground">signalDispatcher.dispatch()</code>{" "}
                manually in sandbox to generate telemetry. Market labels:{" "}
                {getMarketLabel("OVER_0_5")} / {getMarketLabel("OVER_1_5")}.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
