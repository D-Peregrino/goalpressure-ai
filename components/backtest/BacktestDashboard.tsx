"use client";

import EngineTelemetryStrip from "@/components/engine/EngineTelemetryStrip";
import SportKpiCard from "@/components/ui/sport/SportKpiCard";
import { SportPanel, SportSectionTitle } from "@/components/ui/sport/SportPanel";
import { useBacktest } from "@/hooks/useBacktest";
import { useEngineInsights } from "@/hooks/useEngineInsights";
import { Activity } from "lucide-react";

function SegmentTable({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; total: number; wins: number; hitRate: number; roi: number }[];
}) {
  return (
    <SportPanel className="overflow-hidden p-0">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <span className="text-xs font-semibold text-[rgba(148,163,184,0.95)]">
          {title}
        </span>
      </div>
      <div className="max-h-[200px] overflow-y-auto p-3 text-xs">
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
    </SportPanel>
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
      <div className="flex flex-wrap items-end justify-end gap-4">
        <button
          type="button"
          onClick={() => void runBacktest()}
          disabled={running}
          className="rounded-full border border-[#ff6b6b]/40 bg-[#ff6b6b]/10 px-4 py-2 text-sm font-medium text-[#ff8a8a] transition hover:bg-[#ff6b6b]/20 disabled:opacity-50"
        >
          {running ? "Rodando histórico…" : "Rodar histórico"}
        </button>
      </div>

      <EngineTelemetryStrip engine={engine} />

      {status === "error" && (
        <p className="text-sm text-red-300">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SportKpiCard label="Retorno" value={roi} accent={Boolean(lastRun && lastRun.roi > 0)} />
        <SportKpiCard label="Taxa de acerto" value={hitPct} />
        <SportKpiCard
          label="Queda máxima"
          value={lastRun ? `${lastRun.maxDrawdown.toFixed(2)}u` : "—"}
        />
        <SportKpiCard
          label="Valor esperado médio"
          value={lastRun ? `${(lastRun.averageEv * 100).toFixed(1)}%` : snapshot ? `${(snapshot.averageEv * 100).toFixed(1)}%` : "—"}
        />
        <SportKpiCard label="Lucro" value={lastRun ? lastRun.profitUnits.toFixed(2) : "—"} />
        <SportKpiCard
          label="Sequência de acertos"
          value={String(snapshot?.winStreak ?? lastRun?.streaks.currentWinStreak ?? 0)}
        />
        <SportKpiCard
          label="Sequência de erros"
          value={String(snapshot?.loseStreak ?? lastRun?.streaks.currentLoseStreak ?? 0)}
        />
        <SportKpiCard
          label="Consistência"
          value={lastRun ? lastRun.sharpeLikeRatio.toFixed(2) : "—"}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SegmentTable title="Por mercado" rows={byMarket} />
        <SegmentTable title="Por grau de execução" rows={byExecutionGrade} />
        <SegmentTable title="Por intensidade" rows={byPressureRange} />
        <SegmentTable title="Por fase do jogo" rows={byTemporalPhase} />
      </div>

      {snapshot?.updatedAt && (
        <p className="flex items-center gap-1.5 text-xs text-[rgba(148,163,184,0.85)]">
          <Activity className="h-3 w-3" />
          Última atualização {new Date(snapshot.updatedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
