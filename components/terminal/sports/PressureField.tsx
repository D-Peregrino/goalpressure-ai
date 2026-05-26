"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { pressureFieldLabel, pressureZoneSide } from "@/lib/terminal/sportsDisplay";

export default function PressureField({ match }: { match: EnrichedLiveMatch }) {
  const side = pressureZoneSide(match);
  const label = pressureFieldLabel(match);
  const showZone = match.isLive && match.pressureScore >= 15;

  const sideLabel =
    side === "home"
      ? `Zona quente: ${match.homeTeam} (mandante)`
      : side === "away"
        ? `Zona quente: ${match.awayTeam} (visitante)`
        : "Zona equilibrada no meio-campo";

  return (
    <div className="gp-pressure-field-wrap">
      <div className="gp-pressure-field-head">
        <h4 className="gp-pressure-field-title">Campo de pressão ofensiva</h4>
        <p className="gp-pressure-field-sub" title="Área vermelha indica maior pressão ofensiva">
          {sideLabel}
        </p>
      </div>
      <div className="gp-pressure-field" aria-label="Campo de pressão ofensiva">
        <div className="gp-pressure-field__lines" aria-hidden />
        {showZone && (
          <div
            className={`gp-pressure-field__zone gp-pressure-field__zone--${side}`}
            aria-hidden
          />
        )}
        <p className="gp-pressure-field__label">{label}</p>
      </div>
      <p className="gp-pressure-field-legend">
        Vermelho/laranja = maior pressão · Verde = gramado · Leitura em tempo real
      </p>
    </div>
  );
}
