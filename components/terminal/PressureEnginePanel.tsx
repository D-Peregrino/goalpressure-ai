"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  classificationGlowClass,
  type PressureClassification,
} from "@/lib/engine/pressure/classifyPressure";
import { momentumClassLabel } from "@/lib/engine/pressure/calculateMomentum";
import type { MomentumClassification } from "@/lib/engine/pressure/pressure.types";

function readClassification(m: EnrichedLiveMatch): PressureClassification {
  const c = m.pressureClassification;
  if (
    c === "LOW" ||
    c === "MEDIUM" ||
    c === "HIGH" ||
    c === "VERY_HIGH" ||
    c === "EXTREME"
  ) {
    return c;
  }
  const s = m.pressureScore;
  if (s >= 90) return "EXTREME";
  if (s >= 75) return "VERY_HIGH";
  if (s >= 60) return "HIGH";
  if (s >= 40) return "MEDIUM";
  return "LOW";
}

export default function PressureEnginePanel({
  matches,
  activeSignals,
}: {
  matches: EnrichedLiveMatch[];
  activeSignals: number;
}) {
  const live = matches.filter((m) => m.isLive);
  const top = [...live].sort((a, b) => b.pressureScore - a.pressureScore).slice(0, 6);

  return (
    <section className="gp-pressure-engine-panel">
      <header className="gp-pressure-engine-panel__head">
        <h2 className="gp-type-title">Motor de pressão</h2>
        <span className="gp-sport-badge gp-sport-badge--live">DADOS REAIS · SPORTMONKS</span>
      </header>
      <div className="gp-pressure-engine-panel__kpis">
        <div>
          <p className="gp-type-caption">Jogos monitorados</p>
          <p className="gp-pressure-engine-panel__value tabular-nums">{matches.length}</p>
        </div>
        <div>
          <p className="gp-type-caption">Ao vivo</p>
          <p className="gp-pressure-engine-panel__value tabular-nums">{live.length}</p>
        </div>
        <div>
          <p className="gp-type-caption">Sinais ativos</p>
          <p className="gp-pressure-engine-panel__value tabular-nums">{activeSignals}</p>
        </div>
      </div>
      {top.length === 0 ? (
        <p className="gp-type-caption text-muted">
          Aguardando fixtures in-play para calcular pressão ofensiva.
        </p>
      ) : (
        <ul className="gp-pressure-engine-panel__list">
          {top.map((m) => {
            const cls = readClassification(m);
            const momClass = (m.engineMomentumClass ?? "WEAK") as MomentumClassification;
            return (
              <li
                key={m.fixtureId}
                className={`gp-pressure-engine-panel__row ${classificationGlowClass(cls)}`}
              >
                <div className="gp-pressure-engine-panel__match">
                  <span className="gp-clamp-1">
                    {m.homeTeam} x {m.awayTeam}
                  </span>
                  <span className="gp-type-caption">{m.minuteLabel}</span>
                </div>
                <div className="gp-pressure-engine-panel__metrics tabular-nums">
                  <span title="Pressure">P {Math.round(m.pressureScore)}</span>
                  <span title="Momentum">M {m.engineMomentumScore ?? m.momentum}</span>
                  <span title="Acceleration">A {m.engineAccelerationScore ?? "—"}</span>
                  <span title="Territorial">T {m.engineTerritorialScore ?? "—"}</span>
                </div>
                <div className="gp-pressure-engine-panel__tags">
                  <span className="gp-pressure-engine-panel__class">{cls}</span>
                  <span className="gp-type-caption">{momentumClassLabel(momClass)}</span>
                  {m.engineActiveSignal && (
                    <span className="gp-pressure-engine-panel__signal">
                      {m.engineActiveSignal}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
