"use client";

import { useMemo, type ReactNode } from "react";
import {
  Activity,
  BarChart3,
  Gauge,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import EngineTelemetryStrip from "@/components/engine/EngineTelemetryStrip";
import SportKpiCard from "@/components/ui/sport/SportKpiCard";
import { SportPanel, SportSectionTitle } from "@/components/ui/sport/SportPanel";
import { ANALYTICS_KPI, STATUS_LABEL } from "@/lib/ux/productCopy";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useEngineInsights } from "@/hooks/useEngineInsights";
import type { SignalAnalyticsSummary } from "@/lib/analytics/signalAnalytics";
import type { RecentResolvedSignalRow } from "@/types/analyticsApi";
import { getMarketLabel } from "@/types/domain";

const CHART_GRID = "rgba(255, 43, 43, 0.1)";
const CHART_AXIS = "#8a96a3";
const CHART_LINE = "#ff4d4d";
const CHART_BAR_HIT = "#ff2b2b";
const CHART_BAR_MISS = "#5c6570";

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatRoi(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}u`;
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function formatUpdatedAt(iso: string | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "medium",
  });
}


function AnalyticsOperationalBar({
  generatedAt,
  signalsProcessed,
  sourceStatus,
  status,
  responseTime,
  error,
}: {
  generatedAt?: string;
  signalsProcessed: number;
  sourceStatus: string | null;
  status: string;
  responseTime: number | null;
  error: string | null;
}) {
  const feedLabel = STATUS_LABEL[status] ?? status;

  return (
    <div className="gp-sport-stat-bar">
      <div className="gp-sport-stat-bar__cell">
        <p className="gp-sport-stat-bar__label">{ANALYTICS_KPI.updated}</p>
        <p className="gp-sport-stat-bar__value text-[11px]">
          {formatUpdatedAt(generatedAt)}
        </p>
      </div>
      <div className="gp-sport-stat-bar__cell">
        <p className="gp-sport-stat-bar__label">{ANALYTICS_KPI.processed}</p>
        <p className="gp-sport-stat-bar__value gp-sport-stat-bar__value--accent tabular-nums">
          {signalsProcessed}
        </p>
      </div>
      <div className="gp-sport-stat-bar__cell">
        <p className="gp-sport-stat-bar__label">{ANALYTICS_KPI.source}</p>
        <p className="gp-sport-stat-bar__value">
          {sourceStatus === "READY" ? "Pronto" : (sourceStatus ?? "—")}
        </p>
      </div>
      <div className="gp-sport-stat-bar__cell">
        <p className="gp-sport-stat-bar__label">{ANALYTICS_KPI.feed}</p>
        <p className="gp-sport-stat-bar__value">{feedLabel}</p>
      </div>
      <div className="gp-sport-stat-bar__cell">
        <p className="gp-sport-stat-bar__label">{ANALYTICS_KPI.latency}</p>
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
  );
}

function KpiGrid({ summary }: { summary: SignalAnalyticsSummary | null }) {
  const t = summary?.totals;
  const streaks = summary?.streaks;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
      <SportKpiCard
        label={ANALYTICS_KPI.totalSignals}
        value={String(t?.totalSignals ?? 0)}
        sub={`${t?.resolvedSignals ?? 0} encerrados · ${t?.pendingSignals ?? 0} em aberto`}
        icon={<Zap className="h-3.5 w-3.5" />}
        accent
      />
      <SportKpiCard
        label={ANALYTICS_KPI.hitRate}
        value={t ? formatPercent(t.hitRate) : "—"}
        sub={t ? `Erros ${formatPercent(t.missRate)}` : undefined}
        icon={<Target className="h-3.5 w-3.5" />}
      />
      <SportKpiCard
        label={ANALYTICS_KPI.roiTotal}
        value={t ? formatRoi(t.roiTotal) : "—"}
        accent={(t?.roiTotal ?? 0) > 0}
        icon={<TrendingUp className="h-3.5 w-3.5" />}
      />
      <SportKpiCard
        label={ANALYTICS_KPI.roiAvg}
        value={t ? formatRoi(t.roiAverage) : "—"}
        icon={<BarChart3 className="h-3.5 w-3.5" />}
      />
      <SportKpiCard
        label={ANALYTICS_KPI.avgOdds}
        value={t ? t.averageOdd.toFixed(2) : "—"}
      />
      <SportKpiCard
        label={ANALYTICS_KPI.avgPressure}
        value={t ? String(Math.round(t.averagePressure)) : "—"}
        icon={<Gauge className="h-3.5 w-3.5" />}
      />
      <SportKpiCard
        label={ANALYTICS_KPI.maxDrawdown}
        value={streaks ? formatRoi(-streaks.maxDrawdown) : "—"}
        icon={<TrendingDown className="h-3.5 w-3.5" />}
      />
      <SportKpiCard
        label={ANALYTICS_KPI.bestStreak}
        value={String(streaks?.bestHitStreak ?? 0)}
        sub={
          streaks
            ? `Pior sequência de erros: ${streaks.worstMissStreak}`
            : undefined
        }
        accent
        icon={<Activity className="h-3.5 w-3.5" />}
      />
    </div>
  );
}

function CumulativeRoiChart({ summary }: { summary: SignalAnalyticsSummary }) {
  const data = useMemo(
    () =>
      summary.roiCurve.map((point, index) => ({
        index: index + 1,
        label: new Date(point.resolvedAt).toLocaleTimeString(undefined, {
          hour: "2-digit",
          minute: "2-digit",
        }),
        cumulativeRoi: point.cumulativeRoi,
        roi: point.roi,
        outcome: point.outcome,
      })),
    [summary.roiCurve]
  );

  if (data.length === 0) {
    return (
      <p className="gp-sport-empty">
        {ANALYTICS_KPI.noResolved}
      </p>
    );
  }

  return (
    <div className="h-[240px] w-full sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
          <XAxis
            dataKey="index"
            tick={{ fill: CHART_AXIS, fontSize: 10, fontFamily: "monospace" }}
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
            labelFormatter={(_, payload) => {
              const row = payload?.[0]?.payload as { label: string } | undefined;
              return row?.label ?? "";
            }}
            formatter={(value) => [
              formatRoi(Number(value ?? 0)),
              "Cumulative",
            ]}
          />
          <Line
            type="monotone"
            dataKey="cumulativeRoi"
            stroke={CHART_LINE}
            strokeWidth={2}
            dot={{ fill: CHART_LINE, r: 3 }}
            activeDot={{ r: 5, fill: "#ff2b2b" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketRoiChart({ summary }: { summary: SignalAnalyticsSummary }) {
  const data = useMemo(
    () => [
      {
        name: "Over 0.5",
        roi: summary.byMarket.OVER_0_5.roiTotal,
        hitRate: summary.byMarket.OVER_0_5.hitRate,
      },
      {
        name: "Over 1.5",
        roi: summary.byMarket.OVER_1_5.roiTotal,
        hitRate: summary.byMarket.OVER_1_5.hitRate,
      },
    ],
    [summary.byMarket]
  );

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_AXIS, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_AXIS, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "#11161d",
              border: "1px solid #1a222c",
              fontFamily: "monospace",
              fontSize: 11,
            }}
            formatter={(value, _name, item) => {
              const row = item?.payload as { hitRate: number };
              return [
                `${formatRoi(Number(value ?? 0))} · HR ${formatPercent(row?.hitRate ?? 0)}`,
                "ROI",
              ];
            }}
          />
          <Bar dataKey="roi" radius={[2, 2, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.roi >= 0 ? CHART_BAR_HIT : CHART_BAR_MISS}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ConfidenceRoiChart({ summary }: { summary: SignalAnalyticsSummary }) {
  const data = useMemo(
    () => [
      {
        name: "MEDIUM",
        roi: summary.byConfidence.MEDIUM.roiTotal,
        count: summary.byConfidence.MEDIUM.totalSignals,
      },
      {
        name: "HIGH",
        roi: summary.byConfidence.HIGH.roiTotal,
        count: summary.byConfidence.HIGH.totalSignals,
      },
    ],
    [summary.byConfidence]
  );

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: CHART_AXIS, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_AXIS, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
            width={36}
          />
          <Tooltip
            contentStyle={{
              background: "#11161d",
              border: "1px solid #1a222c",
              fontFamily: "monospace",
              fontSize: 11,
            }}
            formatter={(value, _name, item) => {
              const row = item?.payload as { count: number };
              return [
                `${formatRoi(Number(value ?? 0))} · n=${row?.count ?? 0}`,
                "ROI",
              ];
            }}
          />
          <Bar dataKey="roi" fill={CHART_LINE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function PressureDistributionChart({
  summary,
}: {
  summary: SignalAnalyticsSummary;
}) {
  const data = useMemo(
    () =>
      (Object.entries(summary.byPressureRange) as [string, { totalSignals: number; hits: number; hitRate: number }][]).map(
        ([range, bucket]) => ({
          range,
          signals: bucket.totalSignals,
          hits: bucket.hits,
          hitRate: bucket.hitRate,
        })
      ),
    [summary.byPressureRange]
  );

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="range"
            tick={{ fill: CHART_AXIS, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: CHART_AXIS, fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: CHART_GRID }}
            tickLine={false}
            width={28}
          />
          <Tooltip
            contentStyle={{
              background: "#11161d",
              border: "1px solid #1a222c",
              fontFamily: "monospace",
              fontSize: 11,
            }}
            formatter={(value, name, item) => {
              const row = item?.payload as { hitRate: number };
              const num = Number(value ?? 0);
              if (name === "signals") {
                return [
                  `${num} signals · HR ${formatPercent(row?.hitRate ?? 0)}`,
                  "Volume",
                ];
              }
              return [num, "Hits"];
            }}
          />
          <Bar dataKey="signals" fill="rgba(255, 43, 43, 0.55)" radius={[2, 2, 0, 0]} />
          <Bar dataKey="hits" fill={CHART_LINE} radius={[2, 2, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ResolvedSignalsTable({
  rows,
}: {
  rows: RecentResolvedSignalRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="gp-sport-empty">Nenhum alerta encerrado no arquivo</p>
    );
  }

  return (
    <div className="gp-sport-table-wrap">
      <table className="gp-sport-table min-w-[640px]">
        <thead>
          <tr>
            <th>Partida</th>
            <th>Mercado</th>
            <th className="text-right">Odd</th>
            <th className="text-right">Intensidade</th>
            <th className="text-right">Retorno</th>
            <th className="text-center">Resultado</th>
            <th className="text-right">Tempo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.signalId}>
              <td className="max-w-[180px] truncate">{row.matchLabel}</td>
              <td>{row.marketLabel ?? getMarketLabel(row.market)}</td>
              <td className="text-right tabular-nums">{row.odd.toFixed(2)}</td>
              <td className="text-right tabular-nums text-[#ff8a8a]">
                {Math.round(row.pressure)}
              </td>
              <td
                className={`text-right tabular-nums font-semibold ${
                  row.roi >= 0 ? "text-[#ff8a8a]" : ""
                }`}
              >
                {formatRoi(row.roi)}
              </td>
              <td className="text-center">
                <span
                  className={`gp-sport-outcome ${
                    row.outcome === "HIT"
                      ? "gp-sport-outcome--hit"
                      : "gp-sport-outcome--miss"
                  }`}
                >
                  {row.outcome === "HIT" ? "Acerto" : "Erro"}
                </span>
              </td>
              <td className="text-right tabular-nums">
                {formatDuration(row.timeToResolution)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const {
    summary,
    recentResolved,
    status,
    sourceStatus,
    signalsProcessed,
    error,
    lastUpdated,
    responseTime,
    isInitialLoad,
  } = useAnalytics();
  const {
    engine,
    dispatchQueueSize,
    loading: engineLoading,
  } = useEngineInsights();

  const feedKey =
    status === "loading" && isInitialLoad
      ? "SYNC"
      : status === "error"
        ? "ERROR"
        : "LIVE";

  return (
    <>
      <AnalyticsOperationalBar
        generatedAt={summary?.generatedAt}
        signalsProcessed={signalsProcessed}
        sourceStatus={sourceStatus}
        status={feedKey}
        responseTime={responseTime}
        error={error}
      />

      <EngineTelemetryStrip
        engine={engine}
        loading={engineLoading}
        dispatchQueueSize={dispatchQueueSize}
      />

      {isInitialLoad && status === "loading" ? (
        <SportPanel className="flex min-h-[200px] items-center justify-center">
          <p className="gp-sport-empty animate-pulse">{ANALYTICS_KPI.loading}</p>
        </SportPanel>
      ) : (
        <div className="space-y-6">
          <section>
            <SportSectionTitle>{ANALYTICS_KPI.coreMetrics}</SportSectionTitle>
            <KpiGrid summary={summary} />
          </section>

          {summary ? (
            <>
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <SportPanel title={ANALYTICS_KPI.cumulativeRoi}>
                  <CumulativeRoiChart summary={summary} />
                </SportPanel>
                <SportPanel title={ANALYTICS_KPI.roiByMarket}>
                  <MarketRoiChart summary={summary} />
                </SportPanel>
                <SportPanel title={ANALYTICS_KPI.roiByConfidence}>
                  <ConfidenceRoiChart summary={summary} />
                </SportPanel>
                <SportPanel title={ANALYTICS_KPI.pressureDist}>
                  <PressureDistributionChart summary={summary} />
                </SportPanel>
              </section>

              <SportPanel>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <SportSectionTitle className="mb-0">
                    {ANALYTICS_KPI.recentResolved}
                  </SportSectionTitle>
                  {lastUpdated && (
                    <p className="text-xs text-[rgba(148,163,184,0.85)]">
                      Atualizado {formatUpdatedAt(new Date(lastUpdated).toISOString())}
                    </p>
                  )}
                </div>
                <ResolvedSignalsTable rows={recentResolved} />
              </SportPanel>
            </>
          ) : (
            <SportPanel>
              <div className="gp-sport-empty">
                <p>{ANALYTICS_KPI.empty}</p>
                <p className="gp-sport-empty__hint">{ANALYTICS_KPI.emptyHint}</p>
              </div>
            </SportPanel>
          )}
        </div>
      )}
    </>
  );
}
