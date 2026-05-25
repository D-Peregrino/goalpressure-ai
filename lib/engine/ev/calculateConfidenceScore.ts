import type { Match } from "@/types/domain";
import type { OffensivePressureResult } from "@/lib/engine/pressure/pressure.types";
import type { DistortionLevel, EvConfidenceClass } from "@/lib/engine/ev/ev.types";

function clamp(v: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, v));
}

export function classifyEvConfidence(score: number): EvConfidenceClass {
  const s = clamp(score);
  if (s >= 82) return "ELITE";
  if (s >= 65) return "HIGH";
  if (s >= 45) return "MEDIUM";
  return "LOW";
}

export function distortionToBoost(level: DistortionLevel): number {
  switch (level) {
    case "EXTREME":
      return 18;
    case "HIGH":
      return 12;
    case "MEDIUM":
      return 6;
    default:
      return 0;
  }
}

/**
 * Confiança quantitativa 0–100 para entrada live.
 */
export function calculateConfidenceScore(
  match: Match,
  pressure: OffensivePressureResult,
  distortionLevel: DistortionLevel,
  evPercent: number
): { score: number; class: EvConfidenceClass } {
  const stability =
    pressure.momentumClass === "EXPLOSIVE" || pressure.momentumClass === "STRONG"
      ? 12
      : pressure.momentumClass === "GROWING"
        ? 6
        : 0;

  const raw =
    pressure.momentumScore * 0.22 +
    pressure.pressureScore * 0.28 +
    stability +
    pressure.accelerationScore * 0.15 +
    pressure.territorialScore * 0.12 +
    distortionToBoost(distortionLevel) +
    clamp(evPercent * 0.8, 0, 15) +
    clamp(match.stats.shotsOnTarget * 3 + match.stats.dangerousAttacks * 0.8, 0, 12);

  const score = clamp(raw);
  return { score, class: classifyEvConfidence(score) };
}
