import type { Match } from "@/types/domain";
import { computeRollingWindowStats } from "@/lib/engine/pressure/rollingWindow";

const BENCHMARKS = {
  possession: 68,
  corners: 8,
  dangerousAttacks: 22,
  shotsOnTarget: 7,
} as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return clamp((value / cap) * 100);
}

function resolvePossession(match: Match): number {
  if (match.stats.possession != null && match.stats.possession > 0) {
    return clamp(match.stats.possession);
  }
  const attackWeight =
    match.stats.dangerousAttacks * 1.2 + match.stats.shots * 0.8;
  return clamp(45 + attackWeight * 0.35, 40, 72);
}

function resolveSot(match: Match): number {
  if (match.stats.shotsOnTarget > 0) return match.stats.shotsOnTarget;
  return Math.max(0, Math.round(match.stats.shots * 0.38));
}

/**
 * Domínio territorial ofensivo: posse, corners, ataques perigosos, SOT.
 */
export function calculateTerritorialPressure(match: Match): number {
  const rolling = computeRollingWindowStats(match);
  const possession = resolvePossession(match);
  const sot = resolveSot(match);

  const possScore = normalize(possession, BENCHMARKS.possession);
  const cornerScore = normalize(
    Math.max(rolling.corners, match.stats.corners * 0.35),
    BENCHMARKS.corners
  );
  const daScore = normalize(
    Math.max(rolling.dangerousAttacks, match.stats.dangerousAttacks * 0.4),
    BENCHMARKS.dangerousAttacks
  );
  const sotScore = normalize(
    Math.max(rolling.shotsOnTarget, sot * 0.4),
    BENCHMARKS.shotsOnTarget
  );

  return clamp(
    possScore * 0.3 + cornerScore * 0.25 + daScore * 0.25 + sotScore * 0.2
  );
}
