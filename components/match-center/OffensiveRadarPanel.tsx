"use client";

import { memo } from "react";
import MetricSparkline from "@/components/charts/MetricSparkline";
import MiniPressureHeatmap from "@/components/terminal/MiniPressureHeatmap";
import PressureComparisonBar from "@/components/matches/PressureComparisonBar";
import type { Match } from "@/types/domain";

function OffensiveRadarPanelInner({
  match,
  homePressure,
  awayPressure,
  momentum,
  chaosIndex,
  microeventScore,
  sequenceState,
  territorialDominance,
  attackWaveIntensity,
  pressureHistory,
  xg,
}: {
  match: Match;
  homePressure: number;
  awayPressure: number;
  momentum: number;
  chaosIndex: number;
  microeventScore: number;
  sequenceState: string | null;
  territorialDominance: number;
  attackWaveIntensity: number;
  pressureHistory: number[];
  xg: number;
}) {
  const poss = match.stats.possession ?? 50;

  return (
    <section className="gp-mc-panel gp-mc-radar">
      <header className="gp-mc-panel__head">
        <h2 className="gp-mc-panel__title">Radar ofensivo</h2>
      </header>

      <div className="gp-mc-radar__grid">
        <div className="gp-mc-radar__stat">
          <span>Ataques perigosos</span>
          <strong className="tabular-nums">{match.stats.dangerousAttacks}</strong>
        </div>
        <div className="gp-mc-radar__stat">
          <span>Chutes no gol</span>
          <strong className="tabular-nums">{match.stats.shotsOnTarget}</strong>
        </div>
        <div className="gp-mc-radar__stat">
          <span>Posse</span>
          <strong className="tabular-nums">{Math.round(poss)}%</strong>
        </div>
        <div className="gp-mc-radar__stat gp-mc-radar__stat--hot">
          <span>Gols esperados</span>
          <strong className="tabular-nums">{xg.toFixed(2)}</strong>
        </div>
        <div className="gp-mc-radar__stat">
          <span>Campo avançado</span>
          <strong className="tabular-nums">{Math.round(territorialDominance)}</strong>
        </div>
        <div className="gp-mc-radar__stat">
          <span>Onda de ataque</span>
          <strong className="tabular-nums">{Math.round(attackWaveIntensity)}</strong>
        </div>
        <div className="gp-mc-radar__stat">
          <span>Momento quente</span>
          <strong className="tabular-nums">{Math.round(microeventScore)}</strong>
        </div>
        <div className="gp-mc-radar__stat">
          <span>Ritmo</span>
          <strong className="text-xs">{sequenceState ?? "—"}</strong>
        </div>
      </div>

      <div className="gp-mc-radar__zones">
        <div className="gp-mc-radar__zone gp-mc-radar__zone--attack">
          <span>Pressão ofensiva</span>
          <div className="gp-mc-radar__bar">
            <span style={{ width: `${momentum}%` }} />
          </div>
        </div>
        <div className="gp-mc-radar__zone gp-mc-radar__zone--chaos">
          <span>Pressão do jogo</span>
          <div className="gp-mc-radar__bar">
            <span style={{ width: `${chaosIndex}%`, opacity: 0.85 }} />
          </div>
        </div>
      </div>

      <div className="gp-mc-radar__viz">
        <MiniPressureHeatmap points={pressureHistory} />
        <MetricSparkline points={pressureHistory} label="Evolução da intensidade" height={64} />
      </div>

      <PressureComparisonBar
        homeTeam={match.homeTeam}
        awayTeam={match.awayTeam}
        homePressure={homePressure}
        awayPressure={awayPressure}
        dominantSide={
          homePressure > awayPressure + 8
            ? "home"
            : awayPressure > homePressure + 8
              ? "away"
              : "balanced"
        }
      />
    </section>
  );
}

export default memo(OffensiveRadarPanelInner);
