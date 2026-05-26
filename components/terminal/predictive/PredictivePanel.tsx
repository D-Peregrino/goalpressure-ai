"use client";

import { useMemo } from "react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";
import { evaluatePredictiveFromEnriched } from "@/lib/predictive/predictiveEvaluate";
import { evaluateGpiFromEnriched } from "@/lib/gpi/gpiEvaluate";
import type { PredictiveLevel } from "@/lib/predictive/predictive.types";

const LEVEL_CLASS: Record<PredictiveLevel, string> = {
  estavel: "gp-predictive--estavel",
  aceleracao: "gp-predictive--aceleracao",
  pre_ruptura: "gp-predictive--pre",
  ruptura_iminente: "gp-predictive--ruptura",
  exaustao_ofensiva: "gp-predictive--exaustao",
};

export default function PredictivePanel({
  match,
  context,
}: {
  match: EnrichedLiveMatch;
  context: MatchContextResult;
}) {
  const reading = useMemo(
    () => evaluatePredictiveFromEnriched(match),
    [match, context.score]
  );
  const gpi = useMemo(() => evaluateGpiFromEnriched(match), [match]);

  return (
    <section className={`gp-predictive ${LEVEL_CLASS[reading.level]}`}>
      <header className="gp-predictive__head">
        <div>
          <h4 className="gp-predictive__title">Leitura preditiva</h4>
          <p className="gp-predictive__sub">
            Antecipação contextual antes da confirmação total do evento
          </p>
        </div>
        <div className="gp-predictive__badges">
          <span className="gp-predictive__level">{reading.levelLabel}</span>
          <span className="gp-predictive__gpi" title="GoalPressure Index">
            GPI {gpi.score}
          </span>
        </div>
      </header>

      <p className="gp-predictive__narrative">{reading.narrative}</p>

      <div className="gp-predictive__grid">
        <Metric label="Probabilidade contextual" value={`${reading.contextualProbability}%`} />
        <Metric label="Pressão ofensiva provável" value={`${reading.goalPressureProbability}%`} />
        <Metric label="Aceleração ofensiva" value={`${reading.offensiveAcceleration}%`} />
        <Metric label="Risco defensivo" value={`${reading.defensiveRisk}%`} />
        <Metric label="Risco de ruptura" value={`${reading.ruptureRisk}%`} />
        <Metric label="Atraso de mercado" value={`${reading.marketLagScore}%`} />
      </div>

      <div className="gp-predictive__flags">
        {reading.prePressureActive ? (
          <span className="gp-predictive__flag">Pré-pressão ativa</span>
        ) : null}
        {reading.marketLagActive ? (
          <span className="gp-predictive__flag gp-predictive__flag--lag">Mercado atrasado</span>
        ) : null}
      </div>

      <div className="gp-predictive__trend">
        <span>Tendência provável</span>
        <strong>{reading.trendLabel}</strong>
      </div>

      <div className="gp-predictive__timeline">
        <h5>Projeção ofensiva (próximos minutos)</h5>
        <div className="gp-predictive__timeline-bars">
          {reading.projection.map((p) => (
            <div key={p.minute} className="gp-predictive__timeline-col">
              <div
                className="gp-predictive__timeline-bar"
                style={{ height: `${Math.max(8, p.projectedPressure)}%` }}
                title={`Pressão projetada ${p.projectedPressure}`}
              />
              <span>{p.minute}&apos;</span>
            </div>
          ))}
        </div>
        <p className="gp-predictive__timeline-note">
          Projeção indicativa com base na tendência atual — não é confirmação de evento.
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="gp-predictive__metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
