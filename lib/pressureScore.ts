/**
 * GoalPressure AI — Pressure Score Engine (V1)
 *
 * Initial weighted formula (0–100). Will be recalibrated with real match data,
 * xG, league baselines, and backtests. Do not treat weights as final production values.
 *
 * Component weights:
 * - Total shots .............. 20%
 * - Shots on target .......... 20%
 * - Dangerous attacks ........ 20%
 * - Corners .................. 15%
 * - Minute / score context ... 10%
 * - Odds value proxy ......... 15%
 */

import type {
  Match,
  MatchStats,
  Odds,
  PressureSnapshot,
  PressureTier,
  PressureTrend,
} from "@/types/domain";

/** V1 — caps used to normalize raw stats into 0–100 sub-scores */
const BENCHMARKS = {
  shots: 25,
  shotsOnTarget: 12,
  dangerousAttacks: 50,
  corners: 12,
} as const;

const WEIGHTS = {
  shots: 0.2,
  shotsOnTarget: 0.2,
  dangerousAttacks: 0.2,
  corners: 0.15,
  minuteContext: 0.1,
  oddsProxy: 0.15,
} as const;

/** Minimum delta to classify trend vs previous tick */
const TREND_DELTA_THRESHOLD = 2;

export interface CalculatePressureOptions {
  /** Prior score for trend; falls back to match.pressure.score when omitted */
  previousScore?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLinear(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return clamp((value / cap) * 100, 0, 100);
}

/**
 * Tier from pressure score.
 * 0–59 → low · 60–79 → medium · 80–100 → high
 */
export function getPressureTier(score: number): PressureTier {
  const s = clamp(Math.round(score), 0, 100);
  if (s >= 80) return "high";
  if (s >= 60) return "medium";
  return "low";
}

/**
 * Short-term momentum between two scores.
 */
export function getPressureTrend(
  previousScore: number,
  currentScore: number
): PressureTrend {
  const delta = currentScore - previousScore;
  if (delta >= TREND_DELTA_THRESHOLD) return "RISING";
  if (delta <= -TREND_DELTA_THRESHOLD) return "FALLING";
  return "STABLE";
}

function resolveShotsOnTarget(stats: MatchStats): number {
  if (stats.shotsOnTarget > 0) return stats.shotsOnTarget;
  return Math.max(0, Math.round(stats.shots * 0.38));
}

function resolveCorners(stats: MatchStats): number {
  if (stats.corners > 0) return stats.corners;
  return Math.max(
    0,
    Math.round(stats.shots * 0.35 + stats.dangerousAttacks * 0.08)
  );
}

function scoreShots(stats: MatchStats): number {
  return normalizeLinear(stats.shots, BENCHMARKS.shots);
}

function scoreShotsOnTarget(stats: MatchStats): number {
  return normalizeLinear(resolveShotsOnTarget(stats), BENCHMARKS.shotsOnTarget);
}

function scoreDangerousAttacks(stats: MatchStats): number {
  return normalizeLinear(stats.dangerousAttacks, BENCHMARKS.dangerousAttacks);
}

function scoreCorners(stats: MatchStats): number {
  return normalizeLinear(resolveCorners(stats), BENCHMARKS.corners);
}

/**
 * Minute window + scoreline urgency (chase / late 0-0).
 */
function scoreMinuteContext(match: Match): number {
  const minute = clamp(match.minute, 0, 120);
  const home = match.score?.home ?? 0;
  const away = match.score?.away ?? 0;
  const totalGoals = home + away;

  let timing = 40;
  if (minute >= 20 && minute <= 85) {
    timing = minute >= 30 && minute <= 75 ? 100 : 75;
  } else if (minute > 85) {
    timing = 85;
  } else {
    timing = 35;
  }

  let urgency = 45;
  if (minute >= 55) {
    if (totalGoals === 0) urgency = 100;
    else if (totalGoals === 1) urgency = 78;
    else if (totalGoals === 2) urgency = 62;
    else urgency = 48;
  } else if (minute >= 30) {
    urgency = totalGoals <= 1 ? 65 : 50;
  }

  return clamp(timing * 0.55 + urgency * 0.45, 0, 100);
}

/**
 * Market implied goal pressure from Over 0.5 / 1.5 odds (lower odd → higher sub-score).
 */
function scoreOddsValueProxy(odds: Odds): number {
  const o05 = clamp(odds.over05, 1.01, 5);
  const o15 = clamp(odds.over15, 1.01, 6);
  const implied05 = 1 / o05;
  const implied15 = 1 / o15;
  const blended = (implied05 + implied15) / 2;
  return clamp(((blended - 0.35) / 0.45) * 100, 0, 100);
}

/**
 * Computes offensive pressure snapshot for a match (V1 formula).
 */
export function calculatePressureScore(
  match: Match,
  options?: CalculatePressureOptions
): PressureSnapshot {
  const { stats, odds } = match;

  const components = {
    shots: scoreShots(stats),
    shotsOnTarget: scoreShotsOnTarget(stats),
    dangerousAttacks: scoreDangerousAttacks(stats),
    corners: scoreCorners(stats),
    minuteContext: scoreMinuteContext(match),
    oddsProxy: scoreOddsValueProxy(odds),
  };

  const raw =
    components.shots * WEIGHTS.shots +
    components.shotsOnTarget * WEIGHTS.shotsOnTarget +
    components.dangerousAttacks * WEIGHTS.dangerousAttacks +
    components.corners * WEIGHTS.corners +
    components.minuteContext * WEIGHTS.minuteContext +
    components.oddsProxy * WEIGHTS.oddsProxy;

  const score = Math.round(clamp(raw, 0, 100));

  const previous =
    options?.previousScore ?? match.pressure?.score ?? score;
  const trend = getPressureTrend(previous, score);

  return {
    score,
    tier: getPressureTier(score),
    trend,
    capturedAt: Date.now(),
  };
}

/** Recomputes pressure on an existing match (ingest, mock seed, live tick). */
export function applyPressureToMatch(
  match: Match,
  options?: CalculatePressureOptions
): Match {
  return {
    ...match,
    pressure: calculatePressureScore(match, options),
  };
}
