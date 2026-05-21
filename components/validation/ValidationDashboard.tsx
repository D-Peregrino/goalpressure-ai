"use client";

import EngineTelemetryStrip from "@/components/engine/EngineTelemetryStrip";
import { useValidation } from "@/hooks/useValidation";
import { useEngineInsights } from "@/hooks/useEngineInsights";
import type { ValidationSegmentRow } from "@/types/validation";
import { Activity, FlaskConical, ShieldAlert, TrendingUp } from "lucide-react";

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
  rows: ValidationSegmentRow[];
}) {
  return (
    <div className="module-panel overflow-hidden">
      <div className="border-b border-card/80 bg-surface/80 px-3 py-2">
        <span className="font-mono text-[9px] font-bold uppercase tracking-[0.25em] text-muted">
          {title}
        </span>
      </div>
      <div className="max-h-[220px] overflow-y-auto p-3 font-mono text-[10px]">
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
    </div>
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
    <div className="module-panel p-3">
      <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.2em] text-muted">
        {title}
      </p>
      {items.length === 0 ? (
        <p className="font-mono text-[10px] text-muted">—</p>
      ) : (
        <ul className="max-h-[140px] space-y-1 overflow-y-auto font-mono text-[10px]">
          {items.slice(0, 8).map((c) => (
            <li key={`${c.fixtureId}-${c.market}-${c.detail}`} className="text-foreground/85">
              <span className="text-pressure">{c.fixtureId}</span> · {c.market} — {c.detail}
            </li>
          ))}
        </ul>
      )}
    </div>
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.35em] text-muted">
            Institutional Quant Lab
          </p>
          <h1 className="mt-1 font-mono text-xl font-bold tracking-[0.12em] text-pressure">
            Live Validation Lab
          </h1>
          <p className="mt-2 max-w-2xl font-mono text-[10px] text-muted">
            Validação quantitativa contínua — performance segmentada, false positives,
            eficiência de mercado, consenso de engines e Telegram. Sem novos motores de
            sinal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          className="border border-card bg-card px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-foreground hover:border-pressure/50"
        >
          Refresh
        </button>
      </header>

      <EngineTelemetryStrip engine={engine} />

      {status === "error" && (
        <p className="font-mono text-[10px] text-pressure">{error}</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          label="Trades"
          value={String(lab?.tradeCount ?? 0)}
          sub={lab?.source ?? "—"}
        />
        <KpiCard
          label="Hit Rate"
          value={lab ? `${(lab.hitRate * 100).toFixed(1)}%` : "—"}
          accent={Boolean(lab && lab.hitRate >= 0.5)}
        />
        <KpiCard
          label="ROI"
          value={lab ? `${lab.roi >= 0 ? "+" : ""}${lab.roi.toFixed(2)}` : "—"}
          accent={Boolean(lab && lab.roi > 0)}
        />
        <KpiCard
          label="Profit"
          value={lab ? `${lab.profitUnits.toFixed(2)}u` : "—"}
        />
        <KpiCard
          label="Live Score"
          value={
            snapshot && snapshot.matchCount > 0
              ? String(snapshot.averageValidationScore)
              : "—"
          }
          sub={`${live.length} fixtures`}
        />
        <KpiCard
          label="FP Flagged"
          value={String(lab?.falsePositives.totalFlagged ?? 0)}
          accent={(lab?.falsePositives.totalFlagged ?? 0) > 10}
        />
      </div>

      <section>
        <h2 className="section-header mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-pressure" />
          Performance por segmento
        </h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SegmentTable title="Execution Grade" rows={perf?.byExecutionGrade ?? []} />
          <SegmentTable title="League" rows={perf?.byLeague ?? []} />
          <SegmentTable title="Market" rows={perf?.byMarket ?? []} />
          <SegmentTable title="Trigger Window" rows={perf?.byTriggerWindow ?? []} />
          <SegmentTable title="Chaos Level" rows={perf?.byChaosLevel ?? []} />
          <SegmentTable title="Temporal Phase" rows={perf?.byTemporalPhase ?? []} />
          <SegmentTable title="Pressure Range" rows={perf?.byPressureRange ?? []} />
          <SegmentTable title="Confidence Range" rows={perf?.byConfidenceRange ?? []} />
        </div>
      </section>

      <section>
        <h2 className="section-header mb-4 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-pressure" />
          False Positive Analysis
        </h2>
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
          <KpiCard
            label="Closing Line Eff."
            value={String(lab?.marketEfficiency.closingLineEfficiency ?? 0)}
            sub={`n=${lab?.marketEfficiency.samples ?? 0}`}
          />
          <KpiCard
            label="Edge Persistence"
            value={String(lab?.marketEfficiency.edgePersistence ?? 0)}
          />
          <KpiCard
            label="Steam Reaction"
            value={`${lab?.marketEfficiency.steamReactionScore ?? 0}%`}
          />
          <KpiCard
            label="Odds Lag"
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
          <KpiCard
            label="Dispatches"
            value={String(lab?.telegramPerformance.dispatchesSent ?? 0)}
          />
          <KpiCard
            label="Blocked"
            value={String(lab?.telegramPerformance.dispatchesBlocked ?? 0)}
          />
          <KpiCard
            label="Conversion"
            value={`${((lab?.telegramPerformance.conversionRate ?? 0) * 100).toFixed(0)}%`}
          />
          <KpiCard
            label="ROI / Dispatch"
            value={(lab?.telegramPerformance.roiPerDispatch ?? 0).toFixed(2)}
          />
          <KpiCard
            label="Spam Ratio"
            value={`${((lab?.telegramPerformance.spamRatio ?? 0) * 100).toFixed(0)}%`}
            accent={(lab?.telegramPerformance.spamRatio ?? 0) > 0.2}
          />
          <KpiCard
            label="Cooldown Eff."
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
