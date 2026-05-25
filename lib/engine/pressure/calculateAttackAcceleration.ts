import type { Match } from "@/types/domain";
import {
  computeRollingWindowStats,
  getPressureScoreHistory,
} from "@/lib/engine/pressure/rollingWindow";

const RECENT_WINDOW_MIN = 5;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function pctChange(current: number, baseline: number): number {
  if (baseline <= 0) return current > 0 ? 100 : 0;
  return clamp(((current - baseline) / baseline) * 100, 0, 200);
}

/**
 * Crescimento rápido de pressão: últimos ~5 min vs média anterior da partida.
 */
export function calculateAttackAcceleration(match: Match): number {
  const minute = Math.max(1, match.minute);
  const rolling = computeRollingWindowStats(match);
  const windowMin = Math.min(RECENT_WINDOW_MIN, minute);
  const rate = windowMin / minute;

  const recentDA = rolling.dangerousAttacks;
  const recentShots = rolling.shots;
  const recentCorners = rolling.corners;
  const recentSot = rolling.shotsOnTarget;

  const baselineDA = Math.max(1, match.stats.dangerousAttacks * rate * 0.65);
  const baselineShots = Math.max(1, match.stats.shots * rate * 0.65);
  const baselineCorners = Math.max(0.5, match.stats.corners * rate * 0.65);
  const baselineSot = Math.max(0.5, match.stats.shotsOnTarget * rate * 0.65);

  const daGrowth = pctChange(recentDA, baselineDA);
  const shotGrowth = pctChange(recentShots, baselineShots);
  const cornerGrowth = pctChange(recentCorners, baselineCorners);
  const sotGrowth = pctChange(recentSot, baselineSot);

  const history = getPressureScoreHistory(match.id);
  let pressureGrowth = 0;
  if (history.length >= 2) {
    pressureGrowth = pctChange(
      history[history.length - 1],
      history[history.length - 2]
    );
  } else if (match.pressure.trend === "RISING") {
    pressureGrowth = 35;
  }

  const raw =
    daGrowth * 0.32 +
    shotGrowth * 0.28 +
    sotGrowth * 0.2 +
    cornerGrowth * 0.12 +
    pressureGrowth * 0.08;

  return clamp(raw);
}
