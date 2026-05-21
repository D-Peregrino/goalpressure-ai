import type { Match, MatchStats } from "@/types/domain";
import { calculatePressureScore as calculateQuantitativePressure } from "@/lib/engine/pressureScore";

/** Raw score cap before normalization (typical live ceiling ~120–140). */
const NORMALIZATION_CAP = 120;

function resolveShotsOnTarget(stats: MatchStats): number {
  if (stats.shotsOnTarget > 0) return stats.shotsOnTarget;
  return Math.max(0, Math.round(stats.shots * 0.38));
}

function resolveXG(stats: MatchStats): number {
  if (stats.xG != null && stats.xG > 0) return stats.xG;
  const sot = resolveShotsOnTarget(stats);
  return stats.shots * 0.04 + sot * 0.12 + stats.dangerousAttacks * 0.008;
}

/**
 * Production pressure formula (MVP live):
 * (SOT×12) + (shots×5) + (DA×0.35) + (corners×3) + (xG×18) → 0–100
 */
export function calculateProductionPressureRaw(match: Match): {
  raw: number;
  score: number;
  xG: number;
  shotsOnTarget: number;
} {
  const { stats } = match;
  const shotsOnTarget = resolveShotsOnTarget(stats);
  const xG = resolveXG(stats);
  const corners =
    stats.corners > 0
      ? stats.corners
      : Math.max(0, Math.round(stats.shots * 0.2));

  const raw =
    shotsOnTarget * 12 +
    stats.shots * 5 +
    stats.dangerousAttacks * 0.35 +
    corners * 3 +
    xG * 18;

  const legacyScore = Math.min(
    100,
    Math.max(0, Math.round((raw / NORMALIZATION_CAP) * 100))
  );
  const quant = calculateQuantitativePressure(match, { skipTickRecord: true });
  const score = quant.pressureScore;

  return { raw, score: score || legacyScore, xG, shotsOnTarget };
}
