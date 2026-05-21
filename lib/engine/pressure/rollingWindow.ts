import type { Match, MatchStats } from "@/types/domain";
import type { RollingWindowStats } from "@/types/engine";
import { ROLLING_WINDOW_MINUTES } from "@/lib/engine/pressure/pressureWeights";

export interface MatchTickSnapshot {
  minute: number;
  stats: MatchStats;
  pressureScore: number;
  capturedAt: number;
}

const tickHistory = new Map<string, MatchTickSnapshot[]>();
const MAX_TICKS_PER_MATCH = 120;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveShotsOnTarget(stats: MatchStats): number {
  if (stats.shotsOnTarget > 0) return stats.shotsOnTarget;
  return Math.max(0, Math.round(stats.shots * 0.38));
}

function estimateXG(stats: MatchStats): number {
  const sot = resolveShotsOnTarget(stats);
  return clamp(stats.shots * 0.04 + sot * 0.12 + stats.dangerousAttacks * 0.008, 0, 5);
}

function estimatePossession(stats: MatchStats): number {
  const attackWeight = stats.dangerousAttacks * 1.2 + stats.shots * 0.8;
  return clamp(45 + attackWeight * 0.35, 40, 72);
}

export function recordMatchTick(
  matchId: string,
  minute: number,
  stats: MatchStats,
  pressureScore: number
): void {
  const now = Date.now();
  const list = tickHistory.get(matchId) ?? [];
  const last = list[list.length - 1];

  if (
    last &&
    last.minute === minute &&
    Math.abs(last.pressureScore - pressureScore) < 1 &&
    last.stats.shots === stats.shots &&
    last.stats.dangerousAttacks === stats.dangerousAttacks
  ) {
    return;
  }

  list.push({ minute, stats: { ...stats }, pressureScore, capturedAt: now });

  if (list.length > MAX_TICKS_PER_MATCH) {
    list.splice(0, list.length - MAX_TICKS_PER_MATCH);
  }

  tickHistory.set(matchId, list);
}

function getWindowTicks(matchId: string, currentMinute: number): MatchTickSnapshot[] {
  const list = tickHistory.get(matchId) ?? [];
  const minMinute = Math.max(0, currentMinute - ROLLING_WINDOW_MINUTES);
  return list.filter((t) => t.minute >= minMinute);
}

function deltaFromTicks(
  ticks: MatchTickSnapshot[],
  field: keyof MatchStats
): number {
  if (ticks.length < 2) {
    const last = ticks[ticks.length - 1];
    return last ? Math.max(0, last.stats[field] as number) : 0;
  }

  const first = ticks[0];
  const last = ticks[ticks.length - 1];
  return Math.max(0, (last.stats[field] as number) - (first.stats[field] as number));
}

/**
 * Rolling 10-minute offensive window from tick history, with rate-based fallback.
 */
export function computeRollingWindowStats(match: Match): RollingWindowStats {
  const minute = clamp(match.minute, 1, 120);
  const ticks = getWindowTicks(match.id, match.minute);
  const windowMinutes = Math.min(ROLLING_WINDOW_MINUTES, minute);

  if (ticks.length >= 2) {
    return {
      shots: deltaFromTicks(ticks, "shots"),
      shotsOnTarget: deltaFromTicks(ticks, "shotsOnTarget"),
      dangerousAttacks: deltaFromTicks(ticks, "dangerousAttacks"),
      corners: deltaFromTicks(ticks, "corners"),
      xG: Math.max(0, estimateXG(match.stats) - estimateXG(ticks[0].stats)),
      possession: estimatePossession(match.stats),
      windowMinutes,
      estimated: false,
    };
  }

  const rate = windowMinutes / minute;
  const sot = resolveShotsOnTarget(match.stats);

  return {
    shots: clamp(Math.round(match.stats.shots * rate), 0, match.stats.shots),
    shotsOnTarget: clamp(Math.round(sot * rate), 0, sot),
    dangerousAttacks: clamp(
      Math.round(match.stats.dangerousAttacks * rate),
      0,
      match.stats.dangerousAttacks
    ),
    corners: clamp(
      Math.round(match.stats.corners * rate),
      0,
      match.stats.corners
    ),
    xG: estimateXG(match.stats) * rate,
    possession: estimatePossession(match.stats),
    windowMinutes,
    estimated: true,
  };
}

export function getPressureScoreHistory(matchId: string): number[] {
  return (tickHistory.get(matchId) ?? []).map((t) => t.pressureScore);
}

export function pruneStaleTicks(maxAgeMs = 30 * 60_000): void {
  const cutoff = Date.now() - maxAgeMs;
  for (const [id, ticks] of tickHistory.entries()) {
    const filtered = ticks.filter((t) => t.capturedAt >= cutoff);
    if (filtered.length === 0) tickHistory.delete(id);
    else tickHistory.set(id, filtered);
  }
}
