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
        className={`mt-2 font-mono text-xl font-bold tabular-nums tracking-tight sm:text-2xl ${
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
  return (
    <div className="mb-6 grid grid-cols-2 gap-2 border border-card bg-surface/60 p-3 sm:grid-cols-4 lg:grid-cols-5">
      <div className="telemetry-cell px-3 py-2">
        <p className="telemetry-label">Analytics Updated</p>
        <p className="telemetry-value text-[11px]">{formatUpdatedAt(generatedAt)}</p>
      </div>
      <div className="telemetry-cell px-3 py-2">
        <p className="telemetry-label">Signals Processed</p>
        <p className="telemetry-value text-pressure">{signalsProcessed}</p>
      </div>
      <div className="telemetry-cell px-3 py-2">
        <p className="telemetry-label">Source Status</p>
        <p
          className={`telemetry-value ${
            sourceStatus === "READY" ? "text-pressure" : "text-muted"
          }`}
        >
          {sourceStatus ?? "—"}
        </p>
      </div>
      <div className="telemetry-cell px-3 py-2">
        <p className="telemetry-label">Feed</p>
        <p className="telemetry-value uppercase">{status}</p>
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
  );
}

function KpiGrid({ summary }: { summary: SignalAnalyticsSummary | null }) {
  const t = summary?.totals;
  const streaks = summary?.streaks;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
      <KpiCard
        label="Total Signals"
        value={String(t?.totalSignals ?? 0)}
        sub={`${t?.resolvedSignals ?? 0} resolved · ${t?.pendingSignals ?? 0} pending`}
        icon={<Zap className="h-3.5 w-3.5" />}
        accent
      />
      <KpiCard
        label="Hit Rate"
        value={t ? formatPercent(t.hitRate) : "—"}
        sub={t ? `Miss ${formatPercent(t.missRate)}` : undefined}
        icon={<Target className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="ROI Total"
        value={t ? formatRoi(t.roiTotal) : "—"}
        accent={(t?.roiTotal ?? 0) > 0}
        icon={<TrendingUp className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="ROI Médio"
        value={t ? formatRoi(t.roiAverage) : "—"}
        icon={<BarChart3 className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="Avg Odds"
        value={t ? t.averageOdd.toFixed(2) : "—"}
      />
      <KpiCard
        label="Avg Pressure"
        value={t ? String(Math.round(t.averagePressure)) : "—"}
        icon={<Gauge className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="Max Drawdown"
        value={streaks ? formatRoi(-streaks.maxDrawdown) : "—"}
        icon={<TrendingDown className="h-3.5 w-3.5" />}
      />
      <KpiCard
        label="Best Hit Streak"
        value={String(streaks?.bestHitStreak ?? 0)}
        sub={
          streaks
            ? `Worst miss streak ${streaks.worstMissStreak}`
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
      <p className="py-12 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
        No resolved signals yet
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
      <p className="py-10 text-center font-mono text-[10px] uppercase tracking-widest text-muted">
        No resolved signals in archive
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse font-mono text-[11px]">
        <thead>
          <tr className="border-b border-card text-left text-muted">
            <th className="px-3 py-2 font-semibold uppercase tracking-wider">
              Match
            </th>
            <th className="px-3 py-2 font-semibold uppercase tracking-wider">
              Market
            </th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
              Odd
            </th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
              Pressure
            </th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
              ROI
            </th>
            <th className="px-3 py-2 text-center font-semibold uppercase tracking-wider">
              Result
            </th>
            <th className="px-3 py-2 text-right font-semibold uppercase tracking-wider">
              Resolution
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.signalId}
              className="border-b border-card/60 transition-colors hover:bg-card/30"
            >
              <td className="max-w-[180px] truncate px-3 py-2.5 text-foreground">
                {row.matchLabel}
              </td>
              <td className="px-3 py-2.5 text-muted">
                {row.marketLabel ?? getMarketLabel(row.market)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                {row.odd.toFixed(2)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-pressure">
                {Math.round(row.pressure)}
              </td>
              <td
                className={`px-3 py-2.5 text-right tabular-nums font-bold ${
                  row.roi >= 0 ? "text-pressure" : "text-muted"
                }`}
              >
                {formatRoi(row.roi)}
              </td>
              <td className="px-3 py-2.5 text-center">
                <span
                  className={`inline-block border px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest ${
                    row.outcome === "HIT"
                      ? "border-pressure/50 bg-pressure/10 text-pressure"
                      : "border-card bg-surface text-muted"
                  }`}
                >
                  {row.outcome}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-muted">
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
              Quantitative Performance Layer
            </p>
            <h1 className="mt-1 font-mono text-xl font-bold uppercase tracking-[0.08em] text-foreground sm:text-2xl lg:text-[1.65rem]">
              Signal Analytics Terminal
            </h1>
            <p className="mt-2 max-w-xl font-mono text-[10px] leading-relaxed text-muted">
              Historical efficiency metrics · ROI curve · market & confidence
              segmentation · pressure distribution
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pressure animate-live-blink" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-pressure">
              Analytics Stream
            </span>
          </div>
        </div>
      </header>

      <AnalyticsOperationalBar
        generatedAt={summary?.generatedAt}
        signalsProcessed={signalsProcessed}
        sourceStatus={sourceStatus}
        status={feedLabel}
        responseTime={responseTime}
        error={error}
      />

      <EngineTelemetryStrip
        engine={engine}
        loading={engineLoading}
        dispatchQueueSize={dispatchQueueSize}
      />

      {isInitialLoad && status === "loading" ? (
        <div className="module-panel flex min-h-[200px] items-center justify-center p-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted animate-pulse-glow">
            Loading quantitative archive…
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="section-header mb-4">Core Metrics</h2>
            <KpiGrid summary={summary} />
          </section>

          {summary ? (
            <>
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartPanel title="Cumulative ROI Curve">
                  <CumulativeRoiChart summary={summary} />
                </ChartPanel>
                <ChartPanel title="ROI by Market">
                  <MarketRoiChart summary={summary} />
                </ChartPanel>
                <ChartPanel title="ROI by Confidence">
                  <ConfidenceRoiChart summary={summary} />
                </ChartPanel>
                <ChartPanel title="Pressure Range Distribution">
                  <PressureDistributionChart summary={summary} />
                </ChartPanel>
              </section>

              <section className="corner-brackets-inner module-panel glow-red p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="section-header mb-0">Recent Resolved Signals</h2>
                  {lastUpdated && (
                    <p className="font-mono text-[9px] uppercase tracking-widest text-muted">
                      Synced {formatUpdatedAt(new Date(lastUpdated).toISOString())}
                    </p>
                  )}
                </div>
                <ResolvedSignalsTable rows={recentResolved} />
              </section>
            </>
          ) : (
            <div className="module-panel border-dashed border-card/80 p-10 text-center">
              <p className="font-mono text-[11px] uppercase tracking-[0.25em] text-muted">
                No analytics summary yet
              </p>
              <p className="mt-2 font-mono text-[10px] text-muted/80">
                Run live-matches persistence until signals resolve, then refresh.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
