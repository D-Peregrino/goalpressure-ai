"use client";

import EngineTelemetryStrip from "@/components/engine/EngineTelemetryStrip";
import { useBacktest } from "@/hooks/useBacktest";
import { useEngineInsights } from "@/hooks/useEngineInsights";
import { Activity } from "lucide-react";

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`corner-brackets module-panel p-4 ${
        accent ? "glow-red border-pressure/30" : ""
      }`}
    >
      <p className="telemetry-label">{label}</p>
      <p
        className={`font-mono text-2xl font-bold tabular-nums ${
          accent ? "text-pressure" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 font-mono text-[9px] text-muted">{sub}</p>}
    </div>
  );
}

function SegmentTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; total: number; wins: number; hitRate: number; roi: number }[];
}) {
  return (
    <div className="module-panel overflow-hidden">
      <div className="border-b border-card/80 bg-surface/80 px-3 py-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
          {title}
        </span>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-3 font-mono text-[10px]">
        {rows.length === 0 ? (
          <p className="text-muted">No trades in segment</p>
        ) : (
          rows.map((r) => (
            <div key={r.label} className="mb-1 flex justify-between border-b border-card/40 py-1">
              <span>{r.label}</span>
              <span className="text-muted">
                {r.total} · {(r.hitRate * 100).toFixed(0)}% · {r.roi >= 0 ? "+" : ""}
                {r.roi.toFixed(2)}u
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function BacktestDashboard() {
  const {
    snapshot,
    lastRun,
    byMarket,
    byPressureRange,
    byTemporalPhase,
    byExecutionGrade,
    status,
    error,
    runBacktest,
    running,
  } = useBacktest();
  const { engine } = useEngineInsights();

  const hitPct = lastRun ? `${(lastRun.hitRate * 100).toFixed(1)}%` : "—";
  const roi = lastRun ? `${lastRun.roi >= 0 ? "+" : ""}${lastRun.roi.toFixed(2)}u` : "—";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted">
            Institutional Validation
          </p>
          <h1 className="mt-1 font-mono text-xl font-bold tracking-[0.12em] text-pressure">
            Backtest Terminal
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void runBacktest()}
          disabled={running}
          className="border border-pressure/40 bg-card px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-pressure hover:bg-pressure/10 disabled:opacity-50"
        >
          {running ? "Running…" : "Run Backtest"}
        </button>
      </header>

      <EngineTelemetryStrip engine={engine} />

      {status === "error" && (
        <p className="font-mono text-[10px] text-red-400">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="ROI" value={roi} accent={Boolean(lastRun && lastRun.roi > 0)} />
        <KpiCard label="Hit Rate" value={hitPct} />
        <KpiCard
          label="Max Drawdown"
          value={lastRun ? `${lastRun.maxDrawdown.toFixed(2)}u` : "—"}
        />
        <KpiCard
          label="Avg EV"
          value={lastRun ? `${(lastRun.averageEv * 100).toFixed(1)}%` : snapshot ? `${(snapshot.averageEv * 100).toFixed(1)}%` : "—"}
        />
        <KpiCard label="Profit Units" value={lastRun ? lastRun.profitUnits.toFixed(2) : "—"} />
        <KpiCard
          label="Win Streak"
          value={String(snapshot?.winStreak ?? lastRun?.streaks.currentWinStreak ?? 0)}
        />
        <KpiCard
          label="Lose Streak"
          value={String(snapshot?.loseStreak ?? lastRun?.streaks.currentLoseStreak ?? 0)}
        />
        <KpiCard
          label="Sharpe-like"
          value={lastRun ? lastRun.sharpeLikeRatio.toFixed(2) : "—"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SegmentTable title="By Market" rows={byMarket} />
        <SegmentTable title="By Execution Grade" rows={byExecutionGrade} />
        <SegmentTable title="By Pressure Range" rows={byPressureRange} />
        <SegmentTable title="By Temporal Phase" rows={byTemporalPhase} />
      </div>

      <p className="font-mono text-[9px] text-muted">
        API <code className="text-foreground">GET /api/backtest/results</code> ·{" "}
        <code className="text-foreground">POST /api/backtest/run</code>
        {snapshot?.updatedAt && (
          <>
            {" "}
            · last snapshot{" "}
            <Activity className="inline h-3 w-3" />{" "}
            {new Date(snapshot.updatedAt).toLocaleString()}
          </>
        )}
      </p>
    </div>
  );
}
