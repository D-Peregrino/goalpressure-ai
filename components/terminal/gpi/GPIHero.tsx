"use client";

import { useMemo } from "react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { evaluateGpiFromEnriched } from "@/lib/gpi/gpiEvaluate";
import type { GPIClassification } from "@/lib/gpi/gpi.types";

const CLASS_MOD: Record<GPIClassification, string> = {
  neutro: "gp-gpi-hero--neutro",
  monitoramento: "gp-gpi-hero--monitor",
  aceleracao: "gp-gpi-hero--accel",
  zona_critica: "gp-gpi-hero--critical",
  ruptura_ofensiva_provavel: "gp-gpi-hero--rupture",
};

export default function GPIHero({ match }: { match: EnrichedLiveMatch }) {
  const gpi = useMemo(() => evaluateGpiFromEnriched(match), [match]);

  return (
    <section className={`gp-gpi-hero ${CLASS_MOD[gpi.classification]}`}>
      <div className="gp-gpi-hero__brand">
        <span className="gp-gpi-hero__label">GoalPressure Index</span>
        <span className="gp-gpi-hero__fixture">{gpi.matchLabel}</span>
      </div>

      <div className="gp-gpi-hero__core">
        <div className="gp-gpi-hero__score-wrap">
          <span className="gp-gpi-hero__score" aria-label={`GPI ${gpi.score}`}>
            {gpi.score}
          </span>
          <span className="gp-gpi-hero__score-max">/100</span>
        </div>
        <div className="gp-gpi-hero__meta">
          <span className="gp-gpi-hero__class">{gpi.classificationLabel}</span>
          <span className="gp-gpi-hero__intensity">Intensidade · {gpi.intensity}</span>
          <span className="gp-gpi-hero__trend">{gpi.trendLabel}</span>
        </div>
      </div>

      <p className="gp-gpi-hero__narrative">{gpi.narrative}</p>

      <p className="gp-gpi-hero__disclaimer">
        Índice operacional proprietário — leitura contextual, sem promessa de evento.
      </p>
    </section>
  );
}
