"use client";

import { useMemo, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  FlaskConical,
  Shield,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useResearch } from "@/hooks/useResearch";
import type { ModelComparisonEntry } from "@/lib/analytics/modelComparison";
import type { ExperimentalModelSnapshot } from "@/lib/experimental/experimentalSignalEngine";
import { getMarketLabel } from "@/types/domain";

const CHART_GRID = "rgba(255, 43, 43, 0.1)";
const CHART_AXIS = "#8a96a3";
const CHART_POSITIVE = "#ff2b2b";
const CHART_NEUTRAL = "#5c6570";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatRoi(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}u`;
}

function formatUpdatedAt(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  });
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: ReactNode;
}

function KpiCard({ label, value, sub, accent, icon }: KpiCardProps) {
  return (
    <div
      className={`corner-brackets module-panel scanline-overlay relative overflow-hidden p-4 ${
        accent ? "glow-red border-pressure/30" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="telemetry-label">{label}</p>
        {icon && <span className="text-pressure/70">{icon}</span>}
      </div>
      <p
        className={`mt-2 font-mono text-lg font-bold tabular-nums tracking-tight sm:text-xl ${
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

function ChartPanel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`corner-brackets-inner module-panel scanline-overlay glow-red relative p-4 sm:p-5 ${className}`}
    >
      <h3 className="section-header mb-4">{title}</h3>
      {children}
    </div>
  );
}

function ModelBarChart({
  data,
  dataKey,
  valueFormatter,
}: {
  data: { modelId: string; value: number }[];
  dataKey: string;
  valueFormatter?: (v: number) => string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
        No comparison data
      </p>
    );
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="modelId"
            tick={{ fill: CHART_AXIS, fontSize: 9, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_AXIS, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: "#11161d",
              border: "1px solid #1a222c",
              fontFamily: "monospace",
              fontSize: 11,
            }}
            formatter={(value) => [
              valueFormatter
                ? valueFormatter(Number(value ?? 0))
                : String(value ?? 0),
              dataKey,
            ]}
          />
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.modelId}
                fill={entry.value >= 0 ? CHART_POSITIVE : CHART_NEUTRAL}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ComparisonTable({ models }: { models: ModelComparisonEntry[] }) {
  if (models.length === 0) {
    return (
      <p className="py-10 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
        Run historical analytics to populate model comparison
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b border-card text-left text-muted">
            <th className="px-3 py-2 font-semibold uppercase tracking-wider">
              Model
            </th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
              ROI Total
            </th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
              Hit Rate
            </th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
              Drawdown
            </th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
              Consistency
            </th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wider">
              Strengths
            </th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wider">
              Weaknesses
            </th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wider">
              Recommendation
            </th>
          </tr>
        </thead>
        <tbody>
          {models.map((row) => (
            <tr
              key={row.modelId}
              className="border-b border-card/60 align-top transition-colors hover:bg-card/30"
            >
              <td className="px-3 py-3 font-bold text-pressure">
                {row.modelId}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatRoi(row.metrics.roiTotal)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatPercent(row.metrics.hitRate)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-muted">
                {formatRoi(-row.metrics.maxDrawdown)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums">
                {row.metrics.consistencyScore}
              </td>
              <td className="max-w-[160px] px-3 py-3 text-[10px] text-muted">
                {row.strengths.length > 0
                  ? row.strengths.join(" · ")
                  : "—"}
              </td>
              <td className="max-w-[160px] px-3 py-3 text-[10px] text-muted">
                {row.weaknesses.length > 0
                  ? row.weaknesses.join(" · ")
                  : "—"}
              </td>
              <td className="max-w-[220px] px-3 py-3 text-[10px] leading-relaxed text-foreground/90">
                {row.recommendation}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ExperimentalLiveSection({
  snapshots,
  timestamp,
}: {
  snapshots: ExperimentalModelSnapshot[];
  timestamp?: string;
}) {
  const active = snapshots.filter((s) => s.signalsGenerated > 0);

  if (snapshots.length === 0) {
    return (
      <p className="py-8 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
        No experimental snapshot — waiting for live-matches poll
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
        Snapshot {formatUpdatedAt(timestamp)} · {snapshots.length} models
        evaluated · {active.length} generating signals now
      </p>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {snapshots.map((snap) => (
          <div
            key={snap.modelId}
            className={`telemetry-cell p-4 ${
              snap.signalsGenerated > 0 ? "border-pressure/30 glow-red" : ""
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-pressure">
                {snap.modelId}
              </span>
              <span
                className={`font-mono text-[9px] font-bold uppercase tracking-widest ${
                  snap.signalsGenerated > 0
                    ? "text-pressure animate-pulse-glow"
                    : "text-muted"
                }`}
              >
                {snap.signalsGenerated > 0 ? "ACTIVE" : "IDLE"}
              </span>
            </div>
            <p className="font-mono text-[10px] text-muted">
              {snap.signalsGenerated} signal(s) · {snap.matchesAnalyzed} matches
            </p>
            {snap.signals.length > 0 && (
              <ul className="mt-3 space-y-2 border-t border-card/80 pt-3">
                {snap.signals.map((sig) => (
                  <li
                    key={`${snap.modelId}-${sig.matchId}-${sig.market}`}
                    className="font-mono text-[10px] leading-relaxed text-foreground/90"
                  >
                    <span className="text-pressure">{sig.matchLabel}</span>
                    {" · "}
                    {getMarketLabel(sig.market)} · odd {sig.odd.toFixed(2)} ·
                    P{Math.round(sig.pressureScore)} · {sig.confidence}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ResearchDashboard() {
  const {
    modelComparison,
    experimental,
    recommendations,
    status,
    sourceStatus,
    error,
    lastUpdated,
    responseTime,
    isInitialLoad,
  } = useResearch();

  const chartRows = useMemo(() => {
    if (!modelComparison?.models.length) return [];
    return modelComparison.models.map((m) => {
      const live = experimental?.models.find((e) => e.modelId === m.modelId);
      return {
        modelId: m.modelId,
        roi: m.metrics.roiTotal,
        drawdown: m.metrics.maxDrawdown,
        hitRate: m.metrics.hitRate * 100,
        signals: live?.signalsGenerated ?? m.metrics.totalSignals,
        consistency: m.metrics.consistencyScore,
      };
    });
  }, [modelComparison, experimental]);

  const highestConsistency = useMemo(() => {
    if (!modelComparison?.models.length) return null;
    return [...modelComparison.models].sort(
      (a, b) => b.metrics.consistencyScore - a.metrics.consistencyScore
    )[0];
  }, [modelComparison]);

  const mostActive = useMemo(() => {
    if (!experimental?.models.length) return null;
    return [...experimental.models].sort(
      (a, b) => b.signalsGenerated - a.signalsGenerated
    )[0];
  }, [experimental]);

  const feedLabel =
    status === "loading" && isInitialLoad
      ? "SYNC"
      : status === "error"
        ? "ERROR"
        : "LIVE";

  return (
    <>
      <header className="mb-5 border-b border-card/80 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.35em] text-muted">
              Experimental Quant Lab
            </p>
            <h1 className="mt-1 font-mono text-xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-2xl lg:text-[1.65rem]">
              Model Research Terminal
            </h1>
            <p className="mt-2 max-w-2xl font-mono text-[10px] leading-relaxed text-muted">
              Multi-model A/B comparison · historical backtest metrics · live
              experimental signals · production runtime unchanged
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-pressure" />
            <span className="h-2 w-2 rounded-full bg-pressure animate-live-blink" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pressure">
              Research Stream
            </span>
          </div>
        </div>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-2 border border-card bg-surface/60 p-3 sm:grid-cols-4 lg:grid-cols-5">
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Comparison Updated</p>
          <p className="telemetry-value text-[11px]">
            {formatUpdatedAt(modelComparison?.generatedAt)}
          </p>
        </div>
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Experimental Snapshot</p>
          <p className="telemetry-value text-[11px]">
            {formatUpdatedAt(experimental?.timestamp)}
          </p>
        </div>
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Source Status</p>
          <p className="telemetry-value text-pressure">{sourceStatus ?? "—"}</p>
        </div>
        <div className="telemetry-cell px-3 py-2">
          <p className="telemetry-label">Feed</p>
          <p className="telemetry-value uppercase">{feedLabel}</p>
        </div>
        <div className="telemetry-cell col-span-2 px-3 py-2 sm:col-span-1">
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

      {isInitialLoad && status === "loading" ? (
        <div className="module-panel flex min-h-[200px] items-center justify-center p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted animate-pulse-glow">
            Loading research archives…
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="section-header mb-4">Model Leaders</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <KpiCard
                label="Best Overall"
                value={modelComparison?.bestOverallModel ?? "—"}
                sub="Risk-adjusted composite"
                accent
                icon={<Target className="h-3.5 w-3.5" />}
              />
              <KpiCard
                label="Highest ROI"
                value={modelComparison?.highestRoiModel ?? "—"}
                sub={
                  modelComparison?.models.find(
                    (m) => m.modelId === modelComparison.highestRoiModel
                  )
                    ? formatRoi(
                        modelComparison.models.find(
                          (m) => m.modelId === modelComparison.highestRoiModel
                        )!.metrics.roiTotal
                      )
                    : undefined
                }
                icon={<TrendingUp className="h-3.5 w-3.5" />}
              />
              <KpiCard
                label="Safest Model"
                value={modelComparison?.safestModel ?? "—"}
                sub="Lowest max drawdown"
                icon={<Shield className="h-3.5 w-3.5" />}
              />
              <KpiCard
                label="Highest Consistency"
                value={highestConsistency?.modelId ?? "—"}
                sub={
                  highestConsistency
                    ? `Score ${highestConsistency.metrics.consistencyScore}`
                    : undefined
                }
                icon={<BarChart3 className="h-3.5 w-3.5" />}
              />
              <KpiCard
                label="Most Active"
                value={mostActive?.modelId ?? "—"}
                sub={
                  mostActive
                    ? `${mostActive.signalsGenerated} live signals`
                    : "No live experimental data"
                }
                icon={<Zap className="h-3.5 w-3.5" />}
              />
            </div>
          </section>

          {chartRows.length > 0 && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <ChartPanel title="ROI by Model">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.roi,
                  }))}
                  dataKey="ROI"
                  valueFormatter={formatRoi}
                />
              </ChartPanel>
              <ChartPanel title="Drawdown by Model">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.drawdown,
                  }))}
                  dataKey="Drawdown"
                  valueFormatter={(v) => formatRoi(-v)}
                />
              </ChartPanel>
              <ChartPanel title="Hit Rate by Model">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.hitRate,
                  }))}
                  dataKey="Hit Rate %"
                  valueFormatter={(v) => `${v.toFixed(1)}%`}
                />
              </ChartPanel>
              <ChartPanel title="Signals Generated (Live Experimental)">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.signals,
                  }))}
                  dataKey="Signals"
                />
              </ChartPanel>
              <ChartPanel title="Consistency Score by Model" className="xl:col-span-2">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.consistency,
                  }))}
                  dataKey="Consistency"
                  valueFormatter={(v) => `${Math.round(v)}`}
                />
              </ChartPanel>
            </section>
          )}

          <section className="corner-brackets-inner module-panel glow-red p-4 sm:p-5">
            <h2 className="section-header mb-4">Comparative Model Matrix</h2>
            <ComparisonTable models={modelComparison?.models ?? []} />
          </section>

          <section className="corner-brackets-inner module-panel scanline-overlay p-4 sm:p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="section-header mb-0">Experimental Live Signals</h2>
              {lastUpdated && (
                <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                  Synced{" "}
                  {formatUpdatedAt(new Date(lastUpdated).toISOString())}
                </p>
              )}
            </div>
            <ExperimentalLiveSection
              snapshots={experimental?.models ?? []}
              timestamp={experimental?.timestamp}
            />
          </section>

          {recommendations && recommendations.profitablePatterns.length > 0 && (
            <section className="module-panel border-dashed border-card/60 p-4">
              <h2 className="section-header mb-3">Adaptive Insights (Read-only)</h2>
              <p className="font-mono text-[10px] leading-relaxed text-muted">
                {recommendations.profitablePatterns.length} profitable patterns
                · {recommendations.riskyPatterns.length} risky patterns ·{" "}
                {recommendations.thresholdSuggestions.length} threshold
                suggestions — not applied to production engine.
              </p>
            </section>
          )}
        </div>
      )}
    </>
  );
}
