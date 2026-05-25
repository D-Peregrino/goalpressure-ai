import type { Match } from "@/types/domain";
import type { PressureScoreComponents } from "@/lib/engine/pressure/pressure.types";
import { calculateAttackAcceleration } from "@/lib/engine/pressure/calculateAttackAcceleration";
import { computeRollingWindowStats } from "@/lib/engine/pressure/rollingWindow";

/** Pesos do modelo base (soma = 1.0). */
export const PRESSURE_MODEL_WEIGHTS = {
  dangerousAttacks: 0.3,
  shotsOnTarget: 0.25,
  recentShots: 0.15,
  recentCorners: 0.1,
  possessionDominance: 0.1,
  attackAcceleration: 0.1,
} as const;

const BENCHMARKS = {
  dangerousAttacks: 22,
  shotsOnTarget: 7,
  recentShots: 6,
  recentCorners: 4,
  possession: 68,
} as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return clamp((value / cap) * 100);
}

function resolveSot(match: Match): number {
  if (match.stats.shotsOnTarget > 0) return match.stats.shotsOnTarget;
  return Math.max(0, Math.round(match.stats.shots * 0.38));
}

function resolvePossessionDominance(match: Match): number {
  const p = match.stats.possession;
  if (p != null && p > 0) {
    const dominance = Math.abs(p - 50) * 2;
    return clamp(dominance);
  }
  const attackWeight =
    match.stats.dangerousAttacks * 1.2 + match.stats.shots * 0.8;
  return clamp(attackWeight * 1.1, 0, 100);
}

/**
 * Score ofensivo 0–100 (modelo base GoalPressure).
 */
export function calculatePressureScore(
  match: Match,
  accelerationScore?: number
): { score: number; components: PressureScoreComponents } {
  const rolling = computeRollingWindowStats(match);
  const acceleration =
    accelerationScore ?? calculateAttackAcceleration(match);

  const components: PressureScoreComponents = {
    dangerousAttacks: normalize(
      match.stats.dangerousAttacks,
      BENCHMARKS.dangerousAttacks
    ),
    shotsOnTarget: normalize(resolveSot(match), BENCHMARKS.shotsOnTarget),
    recentShots: normalize(
      Math.max(rolling.shots, rolling.shotsOnTarget),
      BENCHMARKS.recentShots
    ),
    recentCorners: normalize(rolling.corners, BENCHMARKS.recentCorners),
    possessionDominance: normalize(
      resolvePossessionDominance(match),
      BENCHMARKS.possession
    ),
    attackAcceleration: clamp(acceleration),
  };

  const w = PRESSURE_MODEL_WEIGHTS;
  const score = clamp(
    components.dangerousAttacks * w.dangerousAttacks +
      components.shotsOnTarget * w.shotsOnTarget +
      components.recentShots * w.recentShots +
      components.recentCorners * w.recentCorners +
      components.possessionDominance * w.possessionDominance +
      components.attackAcceleration * w.attackAcceleration
  );

  return { score, components };
}
