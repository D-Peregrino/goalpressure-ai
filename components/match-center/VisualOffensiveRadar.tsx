"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import MetricSparkline from "@/components/charts/MetricSparkline";
import MiniPressureHeatmap from "@/components/terminal/MiniPressureHeatmap";
import PressureComparisonBar from "@/components/matches/PressureComparisonBar";
import SportsTooltip from "@/components/ui/SportsTooltip";
import { TOOLTIPS, rotuloIntensidade } from "@/lib/ux/sportsLanguage";
import type { Match } from "@/types/domain";

function radarPolygon(values: number[], size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;
  const n = values.length;
  const pts = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const rad = (Math.min(100, Math.max(0, v)) / 100) * r;
    return `${cx + Math.cos(angle) * rad},${cy + Math.sin(angle) * rad}`;
  });
  return pts.join(" ");
}

const AXES = [
  { key: "pressure", label: "Intensidade" },
  { key: "momentum", label: "Ritmo" },
  { key: "territorial", label: "Campo" },
  { key: "wave", label: "Ataques" },
  { key: "chaos", label: "Pressão" },
] as const;

function VisualOffensiveRadarInner({
  match,
  homePressure,
  awayPressure,
  momentum,
  chaosIndex,
  territorialDominance,
  attackWaveIntensity,
  pressureHistory,
  pressureScore,
}: {
  match: Match;
  homePressure: number;
  awayPressure: number;
  momentum: number;
  chaosIndex: number;
  territorialDominance: number;
  attackWaveIntensity: number;
  pressureHistory: number[];
  pressureScore: number;
}) {
  const values = useMemo(
    () => [
      pressureScore,
      momentum,
      territorialDominance,
      attackWaveIntensity,
      chaosIndex,
    ],
    [
      pressureScore,
      momentum,
      territorialDominance,
      attackWaveIntensity,
      chaosIndex,
    ]
  );

  const gridPoly = radarPolygon([100, 100, 100, 100, 100], 200);
  const dataPoly = radarPolygon(values, 200);
  const size = 200;

  return (
    <section className="gp-mc-panel gp-mc-radar-viz">
      <header className="gp-mc-panel__head">
        <h2 className="gp-mc-panel__title">Radar ofensivo</h2>
        <SportsTooltip label={rotuloIntensidade(pressureScore)} tip={TOOLTIPS.intensidade}>
          <span className="gp-mc-radar-viz__badge">{Math.round(pressureScore)}</span>
        </SportsTooltip>
      </header>

      <div className="gp-mc-radar-viz__layout">
        <div className="gp-mc-radar-viz__chart-wrap">
          <svg
            viewBox={`0 0 ${size} ${size}`}
            className="gp-mc-radar-viz__svg"
            role="img"
            aria-label="Radar ofensivo do jogo"
          >
            <polygon
              points={gridPoly}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="1"
            />
            <polygon
              points={radarPolygon([50, 50, 50, 50, 50], size)}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="1"
            />
            <motion.polygon
              points={dataPoly}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              fill="rgba(255, 43, 43, 0.2)"
              stroke="#ff6b6b"
              strokeWidth="2"
              style={{ transformOrigin: "center" }}
            />
            {AXES.map((ax, i) => {
              const angle = (Math.PI * 2 * i) / AXES.length - Math.PI / 2;
              const x = size / 2 + Math.cos(angle) * (size * 0.46);
              const y = size / 2 + Math.sin(angle) * (size * 0.46);
              return (
                <text
                  key={ax.key}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="gp-mc-radar-viz__axis-label"
                >
                  {ax.label}
                </text>
              );
            })}
          </svg>

          <div className="gp-mc-radar-viz__zones">
            <div className="gp-mc-radar-viz__zone">
              <span>Pressão ofensiva</span>
              <div className="gp-mc-radar-viz__bar">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${momentum}%` }}
                  transition={{ duration: 0.6 }}
                />
              </div>
            </div>
            <div className="gp-mc-radar-viz__zone gp-mc-radar-viz__zone--chaos">
              <span>Pressão do jogo</span>
              <div className="gp-mc-radar-viz__bar">
                <motion.span
                  initial={{ width: 0 }}
                  animate={{ width: `${chaosIndex}%` }}
                  transition={{ duration: 0.6, delay: 0.1 }}
                  style={{ background: "#c084fc" }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="gp-mc-radar-viz__side">
          <MiniPressureHeatmap points={pressureHistory} />
          <MetricSparkline
            points={pressureHistory}
            label="Evolução da intensidade"
            height={72}
          />
        </div>
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

      <details className="gp-mc-radar-viz__details">
        <summary>Números do jogo</summary>
        <div className="gp-mc-radar-viz__nums">
          <span>
            Ataques <strong>{match.stats.dangerousAttacks}</strong>
          </span>
          <span>
            Chutes <strong>{match.stats.shotsOnTarget}</strong>
          </span>
          <span>
            Posse <strong>{Math.round(match.stats.possession ?? 50)}%</strong>
          </span>
        </div>
      </details>
    </section>
  );
}

export default memo(VisualOffensiveRadarInner);
