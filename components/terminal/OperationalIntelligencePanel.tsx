"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { gameStateLabel } from "@/lib/engine/ops/detectGameState";
import { pressurePatternLabel } from "@/lib/engine/ops/detectPressurePattern";
import { riskContextLabel } from "@/lib/engine/ops/calculateRiskContext";
import { temperatureGlowClass } from "@/lib/engine/ops/classifyMatchTemperature";
import type { GameState, MatchTemperature, PressurePattern, RiskContext } from "@/lib/engine/ops/ops.types";

function labelGameState(s?: string): string {
  if (!s) return "—";
  return gameStateLabel(s as GameState);
}

function labelPattern(s?: string): string {
  if (!s || s === "NEUTRAL") return "—";
  return pressurePatternLabel(s as PressurePattern);
}

function labelRisk(s?: string): string {
  if (!s) return "—";
  return riskContextLabel(s as RiskContext);
}

export default function OperationalIntelligencePanel({
  matches,
}: {
  matches: EnrichedLiveMatch[];
}) {
  const ranked = [...matches]
    .filter((m) => m.isLive && m.opsFocusScore != null)
    .sort((a, b) => (b.opsFocusScore ?? 0) - (a.opsFocusScore ?? 0))
    .slice(0, 6);

  const hot = matches.filter(
    (m) => m.opsTemperature === "HOT" || m.opsTemperature === "IGNITE"
  ).length;

  return (
    <section className="gp-ops-intel-panel">
      <header className="gp-ops-intel-panel__head">
        <h2 className="gp-type-title">Inteligência operacional</h2>
        <span className="gp-sport-badge gp-sport-badge--live">CONTEXTO LIVE</span>
      </header>
      <div className="gp-ops-intel-panel__kpis">
        <div>
          <p className="gp-type-caption">Leituras ativas</p>
          <p className="gp-ops-intel-panel__value tabular-nums">{ranked.length}</p>
        </div>
        <div>
          <p className="gp-type-caption">Temperatura alta</p>
          <p className="gp-ops-intel-panel__value tabular-nums">{hot}</p>
        </div>
      </div>
      {ranked.length === 0 ? (
        <p className="gp-type-caption text-muted">
          Aguardando ciclo da engine operacional — leituras contextuais em consolidação.
        </p>
      ) : (
        <ul className="gp-ops-intel-panel__list">
          {ranked.map((m) => (
            <li
              key={m.fixtureId}
              className={`gp-ops-intel-panel__item ${temperatureGlowClass((m.opsTemperature ?? "COLD") as MatchTemperature)}`}
            >
              <div className="gp-ops-intel-panel__item-head">
                <span className="gp-ops-intel-panel__match">
                  {m.homeTeam} x {m.awayTeam}
                </span>
                <span className="gp-ops-intel-panel__temp">{m.opsTemperature ?? "—"}</span>
              </div>
              <div className="gp-ops-intel-panel__meta">
                <span>{labelGameState(m.opsGameState)}</span>
                <span>Caos {m.opsChaosLevel ?? m.chaosIndex}</span>
                <span>{labelRisk(m.opsRiskContext)}</span>
              </div>
              {m.opsPressurePattern && m.opsPressurePattern !== "NEUTRAL" ? (
                <p className="gp-ops-intel-panel__pattern">{labelPattern(m.opsPressurePattern)}</p>
              ) : null}
              <p className="gp-ops-intel-panel__narrative">
                {m.opsNarrative ?? m.displayInsight}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
