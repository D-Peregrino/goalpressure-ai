import type { Match } from "@/types/domain";
import type { LiveMomentumResult } from "@/types/engine";
import {
  computeRollingWindowStats,
  getPressureScoreHistory,
} from "@/lib/engine/pressure/rollingWindow";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return clamp((value / cap) * 100, 0, 100);
}

/**
 * Detects short-term offensive momentum: acceleration, pressure growth,
 * territorial dominance, and offensive burst patterns.
 */
export function calculateLiveMomentum(match: Match): LiveMomentumResult {
  const rolling = computeRollingWindowStats(match);
  const history = getPressureScoreHistory(match.id);
  const flags: string[] = [];

  const pressureGrowth =
    history.length >= 2
      ? history[history.length - 1] - history[history.length - 2]
      : match.pressure.trend === "RISING"
        ? 4
        : match.pressure.trend === "FALLING"
          ? -4
          : 0;

  const acceleration =
    history.length >= 3
      ? history[history.length - 1] -
        2 * history[history.length - 2] +
        history[history.length - 3]
      : pressureGrowth * 0.6;

  const territorialDominance = normalize(
    rolling.possession + rolling.dangerousAttacks * 2.5,
    100
  );

  const offensiveBurst = normalize(
    rolling.shotsOnTarget * 3 +
      rolling.dangerousAttacks * 1.5 +
      rolling.corners * 2,
    45
  );

  if (acceleration >= 5) flags.push("ACCELERATION");
  if (pressureGrowth >= 4) flags.push("PRESSURE_GROWTH");
  if (territorialDominance >= 65) flags.push("TERRITORIAL_DOMINANCE");
  if (offensiveBurst >= 70) flags.push("OFFENSIVE_BURST");

  const momentumScore = Math.round(
    clamp(
      acceleration * 0.25 +
        pressureGrowth * 0.3 +
        territorialDominance * 0.25 +
        offensiveBurst * 0.2,
      0,
      100
    )
  );

  return {
    acceleration: Math.round(acceleration * 10) / 10,
    pressureGrowth: Math.round(pressureGrowth * 10) / 10,
    territorialDominance: Math.round(territorialDominance),
    offensiveBurst: Math.round(offensiveBurst),
    momentumScore,
    flags,
  };
}
