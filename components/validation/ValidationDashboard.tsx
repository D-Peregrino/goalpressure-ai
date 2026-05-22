"use client";

import EngineTelemetryStrip from "@/components/engine/EngineTelemetryStrip";
import SportKpiCard from "@/components/ui/sport/SportKpiCard";
import { SportPanel, SportSectionTitle } from "@/components/ui/sport/SportPanel";
import { useValidation } from "@/hooks/useValidation";
import { useEngineInsights } from "@/hooks/useEngineInsights";
import type { ValidationSegmentRow } from "@/types/validation";
import { Activity, FlaskConical, ShieldAlert, TrendingUp } from "lucide-react";

function SegmentTable({
  title,
  rows,
}: {
  title: string;
  rows: ValidationSegmentRow[];
}) {
  return (
    <SportPanel className="overflow-hidden p-0">
      <div className="border-b border-white/[0.06] px-3 py-2">
        <span className="text-xs font-semibold text-[rgba(148,163,184,0.95)]">
          {title}
        </span>
      </div>
      <div className="max-h-[220px] overflow-y-auto p-3 text-xs">
        {rows.length === 0 ? (
          <p className="text-muted">Sem amostra</p>
        ) : (
          rows.map((r) => (
            <div
              key={r.label}
              className="mb-1 flex justify-between border-b border-card/40 py-1"
            >
              <span className="truncate pr-2">{r.label}</span>
              <span className="shrink-0 text-muted">
                {r.total} · {(r.hitRate * 100).toFixed(0)}% ·{" "}
                {r.roi >= 0 ? "+" : ""}
                {r.roi.toFixed(2)}u
              </span>
            </div>
          ))
        )}
      </div>
    </SportPanel>
  );
}

function FalsePositiveList({
  title,
  items,
}: {
  title: string;
  items: { fixtureId: string; market: string; detail: string }[];
}) {
  return (
    <SportPanel>
      <p className="mb-2 text-xs font-semibold text-[rgba(148,163,184,0.95)]">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-[rgba(148,163,184,0.8)]">—</p>
      ) : (
        <ul className="max-h-[140px] space-y-1 overflow-y-auto text-xs">
          {items.slice(0, 8).map((c) => (
            <li key={`${c.fixtureId}-${c.market}-${c.detail}`}>
              <span className="text-[#ff8a8a]">{c.fixtureId}</span> · {c.market} — {c.detail}
            </li>
          ))}
        </ul>
      )}
    </SportPanel>
  );
}

export default function ValidationDashboard() {
  const {
    snapshot,
    lab,
    live,
    suggestions,
    status,
    error,
    lastUpdated,
    refresh,
  } = useValidation();
  const { engine } = useEngineInsights();

  const perf = lab?.performance;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => void refresh()}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-[#f1f5f9] transition hover:border-[#ff6b6b]/40"
        >
          Atualizar
        </button>
      </div>

      <EngineTelemetryStrip engine={engine} />

      {status === "error" && (
        <p className="text-sm text-red-300">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SportKpiCard
          label="Entradas"
          value={String(lab?.tradeCount ?? 0)}
          sub={lab?.source ?? "—"}
        />
        <SportKpiCard
          label="Taxa de acerto"
          value={lab ? `${(lab.hitRate * 100).toFixed(1)}%` : "—"}
          accent={Boolean(lab && lab.hitRate >= 0.5)}
        />
        <SportKpiCard
          label="Retorno"
          value={lab ? `${lab.roi >= 0 ? "+" : ""}${lab.roi.toFixed(2)}` : "—"}
          accent={Boolean(lab && lab.roi > 0)}
        />
        <SportKpiCard
          label="Lucro"
          value={lab ? `${lab.profitUnits.toFixed(2)}u` : "—"}
        />
        <SportKpiCard
          label="Nota ao vivo"
          value={
            snapshot && snapshot.matchCount > 0
              ? String(snapshot.averageValidationScore)
              : "—"
          }
          sub={`${live.length} jogos`}
        />
        <SportKpiCard
          label="Alertas duvidosos"
          value={String(lab?.falsePositives.totalFlagged ?? 0)}
          accent={(lab?.falsePositives.totalFlagged ?? 0) > 10}
        />
      </div>

      <section>
        <SportSectionTitle className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-[#ff6b6b]" />
          Desempenho por segmento
        </SportSectionTitle>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SegmentTable title="Grau de execução" rows={perf?.byExecutionGrade ?? []} />
          <SegmentTable title="Liga" rows={perf?.byLeague ?? []} />
          <SegmentTable title="Mercado" rows={perf?.byMarket ?? []} />
          <SegmentTable title="Janela de gatilho" rows={perf?.byTriggerWindow ?? []} />
          <SegmentTable title="Ritmo do jogo" rows={perf?.byChaosLevel ?? []} />
          <SegmentTable title="Fase temporal" rows={perf?.byTemporalPhase ?? []} />
          <SegmentTable title="Faixa de intensidade" rows={perf?.byPressureRange ?? []} />
          <SegmentTable title="Faixa de confiança" rows={perf?.byConfidenceRange ?? []} />
        </div>
      </section>

      <section>
        <SportSectionTitle className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#ff6b6b]" />
          Leituras que não se confirmaram
        </SportSectionTitle>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <FalsePositiveList
            title="Sinais que falharam"
            items={(lab?.falsePositives.failedSignals ?? []).map((c) => ({
              fixtureId: c.fixtureId,
              market: c.market,
              detail: c.detail,
            }))}
          />
          <FalsePositiveList
            title="Fake momentum"
            items={(lab?.falsePositives.fakeMomentum ?? []).map((c) => ({
              fixtureId: c.fixtureId,
              market: c.market,
              detail: c.detail,
            }))}
          />
          <FalsePositiveList
            title="Edge falso"
            items={(lab?.falsePositives.falseEdge ?? []).map((c) => ({
              fixtureId: c.fixtureId,
              market: c.market,
              detail: c.detail,
            }))}
          />
          <FalsePositiveList
            title="Pressão improdutiva"
            items={(lab?.falsePositives.unproductivePressure ?? []).map((c) => ({
              fixtureId: c.fixtureId,
              market: c.market,
              detail: c.detail,
            }))}
          />
          <FalsePositiveList
            title="Chaos sem conversão"
            items={(lab?.falsePositives.chaosNoConversion ?? []).map((c) => ({
              fixtureId: c.fixtureId,
              market: c.market,
              detail: c.detail,
            }))}
          />
        </div>
      </section>

      <section>
        <h2 className="section-header mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-pressure" />
          Market Efficiency
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SportKpiCard
            label="Eficiência de fechamento"
            value={String(lab?.marketEfficiency.closingLineEfficiency ?? 0)}
            sub={`amostra ${lab?.marketEfficiency.samples ?? 0}`}
          />
          <SportKpiCard
            label="Persistência de vantagem"
            value={String(lab?.marketEfficiency.edgePersistence ?? 0)}
          />
          <SportKpiCard
            label="Reação do mercado"
            value={`${lab?.marketEfficiency.steamReactionScore ?? 0}%`}
          />
          <SportKpiCard
            label="Atraso das odds"
            value={`${lab?.marketEfficiency.oddsLagScore ?? 0}%`}
          />
        </div>
      </section>

      <section>
        <h2 className="section-header mb-4">Engine Consensus Analysis</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="module-panel overflow-hidden">
            <div className="border-b border-card/80 bg-surface/80 px-3 py-2">
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
                Engine accuracy
              </span>
            </div>
            <div className="max-h-[240px] overflow-y-auto p-3 font-mono text-[10px]">
              {(lab?.engineConsensus.engineAccuracy ?? []).length === 0 ? (
                <p className="text-muted">—</p>
              ) : (
                lab?.engineConsensus.engineAccuracy.map((e) => (
                  <div
                    key={e.engine}
                    className="mb-1 flex justify-between border-b border-card/40 py-1"
                  >
                    <span>{e.engine}</span>
                    <span className="text-muted">
                      {e.totalAttributed} · {(e.hitRate * 100).toFixed(0)}% ·{" "}
                      {e.roi >= 0 ? "+" : ""}
                      {e.roi.toFixed(2)}u
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
          <SegmentTable
            title="Dominant Engines ROI"
            rows={lab?.engineConsensus.dominantEnginesRoi ?? []}
          />
        </div>
        {(lab?.engineConsensus.engineConflicts.length ?? 0) > 0 && (
          <p className="mt-3 font-mono text-[9px] text-muted">
            {lab?.engineConsensus.engineConflicts.length} conflitos de engine registrados
          </p>
        )}
      </section>

      <section>
        <h2 className="section-header mb-4">Live Telegram Performance</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <SportKpiCard
            label="Entradas enviadas"
            value={String(lab?.telegramPerformance.dispatchesSent ?? 0)}
          />
          <SportKpiCard
            label="Bloqueadas"
            value={String(lab?.telegramPerformance.dispatchesBlocked ?? 0)}
          />
          <SportKpiCard
            label="Conversão"
            value={`${((lab?.telegramPerformance.conversionRate ?? 0) * 100).toFixed(0)}%`}
          />
          <SportKpiCard
            label="Retorno por envio"
            value={(lab?.telegramPerformance.roiPerDispatch ?? 0).toFixed(2)}
          />
          <SportKpiCard
            label="Proporção de spam"
            value={`${((lab?.telegramPerformance.spamRatio ?? 0) * 100).toFixed(0)}%`}
            accent={(lab?.telegramPerformance.spamRatio ?? 0) > 0.2}
          />
          <SportKpiCard
            label="Eficiência do intervalo"
            value={`${((lab?.telegramPerformance.cooldownEfficiency ?? 0) * 100).toFixed(0)}%`}
          />
        </div>
      </section>

      <section>
        <h2 className="section-header mb-4 flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-pressure" />
          Calibration Suggestions
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {suggestions.length === 0 ? (
            <p className="font-mono text-[10px] text-muted">
              Nenhuma sugestão automática neste ciclo.
            </p>
          ) : (
            suggestions.map((s) => (
              <div key={s.id} className="module-panel border-l-2 border-pressure/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-mono text-[10px] font-bold text-pressure">
                    {s.title}
                  </p>
                  <span className="font-mono text-[8px] uppercase text-muted">
                    {s.priority}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[10px] text-foreground/90">{s.detail}</p>
                <p className="mt-1 font-mono text-[9px] text-muted">
                  {s.action}
                  {s.suggestedValue != null ? ` → ${String(s.suggestedValue)}` : ""}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h2 className="section-header mb-3">Live fixtures (validation score)</h2>
        <div className="module-panel max-h-[200px] overflow-y-auto p-3 font-mono text-[10px]">
          {live.length === 0 ? (
            <p className="text-muted">Aguardando ciclo live…</p>
          ) : (
            live.slice(0, 20).map((r) => (
              <div
                key={r.fixtureId}
                className="mb-1 flex justify-between border-b border-card/40 py-1"
              >
                <span>
                  {r.matchLabel ?? r.fixtureId} · {r.reliability}
                </span>
                <span className="text-muted">
                  score {r.validationScore} · fp {r.falsePositiveRisk}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <p className="font-mono text-[9px] text-muted">
        API <code className="text-foreground">GET /api/validation/live</code>
        {lastUpdated
          ? ` · updated ${new Date(lastUpdated).toLocaleTimeString()}`
          : ""}
      </p>
    </div>
  );
}
