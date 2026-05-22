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
import EngineTelemetryStrip from "@/components/engine/EngineTelemetryStrip";
import SportKpiCard from "@/components/ui/sport/SportKpiCard";
import { SportPanel, SportSectionTitle } from "@/components/ui/sport/SportPanel";
import { useEngineInsights } from "@/hooks/useEngineInsights";
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
  const {
    engine,
    dispatchQueueSize,
    loading: engineLoading,
  } = useEngineInsights();

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
      <div className="gp-sport-stat-bar">
        <div className="gp-sport-stat-bar__cell">
          <p className="gp-sport-stat-bar__label">Comparativo atualizado</p>
          <p className="gp-sport-stat-bar__value text-[11px]">
            {formatUpdatedAt(modelComparison?.generatedAt)}
          </p>
        </div>
        <div className="gp-sport-stat-bar__cell">
          <p className="gp-sport-stat-bar__label">Snapshot experimental</p>
          <p className="gp-sport-stat-bar__value text-[11px]">
            {formatUpdatedAt(experimental?.timestamp)}
          </p>
        </div>
        <div className="gp-sport-stat-bar__cell">
          <p className="gp-sport-stat-bar__label">Fonte</p>
          <p className="gp-sport-stat-bar__value gp-sport-stat-bar__value--accent">
            {sourceStatus === "READY" ? "Pronto" : (sourceStatus ?? "—")}
          </p>
        </div>
        <div className="gp-sport-stat-bar__cell">
          <p className="gp-sport-stat-bar__label">Feed</p>
          <p className="gp-sport-stat-bar__value">
            {feedLabel === "LIVE" ? "Ao vivo" : feedLabel === "SYNC" ? "Sincronizando" : "Erro"}
          </p>
        </div>
        <div className="gp-sport-stat-bar__cell">
          <p className="gp-sport-stat-bar__label">Resposta</p>
          <p className="gp-sport-stat-bar__value tabular-nums">
            {responseTime != null ? `${responseTime} ms` : "—"}
          </p>
        </div>
        {error && (
          <div className="col-span-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
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
            Loading research archives…
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <SportSectionTitle>Destaques dos modelos</SportSectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              <SportKpiCard
                label="Melhor geral"
                value={modelComparison?.bestOverallModel ?? "—"}
                sub="Combinação ajustada ao risco"
                accent
                icon={<Target className="h-3.5 w-3.5" />}
              />
              <SportKpiCard
                label="Maior retorno"
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
              <SportKpiCard
                label="Mais estável"
                value={modelComparison?.safestModel ?? "—"}
                sub="Menor queda máxima"
                icon={<Shield className="h-3.5 w-3.5" />}
              />
              <SportKpiCard
                label="Mais consistente"
                value={highestConsistency?.modelId ?? "—"}
                sub={
                  highestConsistency
                    ? `Nota ${highestConsistency.metrics.consistencyScore}`
                    : undefined
                }
                icon={<BarChart3 className="h-3.5 w-3.5" />}
              />
              <SportKpiCard
                label="Mais ativo"
                value={mostActive?.modelId ?? "—"}
                sub={
                  mostActive
                    ? `${mostActive.signalsGenerated} alertas ao vivo`
                    : "Sem dados experimentais"
                }
                icon={<Zap className="h-3.5 w-3.5" />}
              />
            </div>
          </section>

          {chartRows.length > 0 && (
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <SportPanel title="Retorno por modelo">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.roi,
                  }))}
                  dataKey="ROI"
                  valueFormatter={formatRoi}
                />
              </SportPanel>
              <SportPanel title="Queda máxima por modelo">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.drawdown,
                  }))}
                  dataKey="Drawdown"
                  valueFormatter={(v) => formatRoi(-v)}
                />
              </SportPanel>
              <SportPanel title="Taxa de acerto por modelo">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.hitRate,
                  }))}
                  dataKey="Hit Rate %"
                  valueFormatter={(v) => `${v.toFixed(1)}%`}
                />
              </SportPanel>
              <SportPanel title="Alertas gerados (experimental)">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.signals,
                  }))}
                  dataKey="Signals"
                />
              </SportPanel>
              <SportPanel title="Consistência por modelo" className="xl:col-span-2">
                <ModelBarChart
                  data={chartRows.map((r) => ({
                    modelId: r.modelId,
                    value: r.consistency,
                  }))}
                  dataKey="Consistency"
                  valueFormatter={(v) => `${Math.round(v)}`}
                />
              </SportPanel>
            </section>
          )}

          <SportPanel>
            <SportSectionTitle>Matriz comparativa de modelos</SportSectionTitle>
            <ComparisonTable models={modelComparison?.models ?? []} />
          </SportPanel>

          <SportPanel>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <SportSectionTitle className="mb-0">
                Alertas experimentais ao vivo
              </SportSectionTitle>
              {lastUpdated && (
                <p className="text-xs text-[rgba(148,163,184,0.85)]">
                  Atualizado {formatUpdatedAt(new Date(lastUpdated).toISOString())}
                </p>
              )}
            </div>
            <ExperimentalLiveSection
              snapshots={experimental?.models ?? []}
              timestamp={experimental?.timestamp}
            />
          </SportPanel>

          {recommendations && recommendations.profitablePatterns.length > 0 && (
            <SportPanel>
              <SportSectionTitle>Insights adaptativos (somente leitura)</SportSectionTitle>
              <p className="text-sm leading-relaxed text-[rgba(148,163,184,0.95)]">
                {recommendations.profitablePatterns.length} padrões lucrativos ·{" "}
                {recommendations.riskyPatterns.length} padrões arriscados ·{" "}
                {recommendations.thresholdSuggestions.length} sugestões de limite
                — não aplicadas ao motor em produção.
              </p>
            </SportPanel>
          )}
        </div>
      )}
    </>
  );
}
