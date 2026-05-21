/**
 * GoalPressure AI — primeiro motor quantitativo ofensivo (0–100).
 * Transforma estatísticas live SportMonks em pressure, momentum, intensidade e probabilidade de gol.
 */

import type { Match, MatchStats, MatchTeamStats, TeamSideStats } from "@/types/domain";
import {
  computeRollingWindowStats,
  getPressureScoreHistory,
  recordMatchTick,
} from "@/lib/engine/pressure/rollingWindow";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface QuantitativePressureResult {
  pressureScore: number;
  momentum: number;
  offensiveIntensity: number;
  goalProbability: number;
  confidence: number;
}

export interface FixtureTeamPressure {
  home: number;
  away: number;
  aggregate: QuantitativePressureResult;
}

export interface CalculatePressureOptions {
  /** Não registra tick no histórico (evita duplicar em pipelines internos) */
  skipTickRecord?: boolean;
  /** Stats alternativos (ex.: lado casa/fora) */
  statsOverride?: MatchStats;
  matchIdOverride?: string;
  minuteOverride?: number;
}

// ─── Pesos (soma ≈ 1.0) — maior peso em SOT, DA e sequência recente ───────────

const WEIGHTS = {
  shotsOnTarget: 0.22,
  dangerousAttacks: 0.18,
  recentOffensiveBurst: 0.14,
  totalAttacks: 0.1,
  shots: 0.08,
  xG: 0.12,
  corners: 0.06,
  possession: 0.05,
  temporalDelta: 0.05,
} as const;

const NORMALIZATION_RAW_CAP = 115;

const BENCHMARKS = {
  shotsOnTarget: 7,
  shots: 14,
  dangerousAttacks: 22,
  totalAttacks: 35,
  corners: 8,
  xG: 2.4,
  possession: 68,
  recentBurst: 40,
  temporalDelta: 18,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, cap: number): number {
  if (cap <= 0) return 0;
  return clamp((value / cap) * 100, 0, 100);
}

function roundScore(value: number): number {
  return clamp(Math.round(value), 0, 100);
}

function resolveShotsOnTarget(stats: MatchStats): number {
  if (stats.shotsOnTarget > 0) return stats.shotsOnTarget;
  if (stats.shots > 0) return Math.max(0, Math.round(stats.shots * 0.38));
  return 0;
}

function resolveTotalAttacks(stats: MatchStats): number {
  if (stats.totalAttacks != null && stats.totalAttacks > 0) {
    return stats.totalAttacks;
  }
  if (stats.dangerousAttacks > 0) {
    return Math.round(stats.dangerousAttacks * 1.45);
  }
  return Math.round(stats.shots * 0.9);
}

function resolveXG(stats: MatchStats, sot: number): number {
  if (stats.xG != null && stats.xG > 0) return stats.xG;
  return clamp(
    stats.shots * 0.04 + sot * 0.12 + stats.dangerousAttacks * 0.008,
    0,
    5
  );
}

function resolvePossession(stats: MatchStats): number {
  if (stats.possession != null && stats.possession > 0) {
    return clamp(stats.possession, 0, 100);
  }
  const attackWeight = stats.dangerousAttacks * 1.2 + stats.shots * 0.8;
  return clamp(45 + attackWeight * 0.35, 40, 72);
}

function resolveCorners(stats: MatchStats): number {
  if (stats.corners > 0) return stats.corners;
  return Math.max(0, Math.round(stats.shots * 0.2));
}

function dataCompleteness(stats: MatchStats): number {
  let present = 0;
  let total = 7;
  if (stats.shots > 0) present += 1;
  if (stats.shotsOnTarget > 0 || stats.shots > 0) present += 1;
  if (stats.dangerousAttacks > 0) present += 1;
  if (stats.totalAttacks != null && stats.totalAttacks > 0) present += 1;
  if (stats.corners > 0) present += 1;
  if (stats.xG != null && stats.xG > 0) present += 1;
  if (stats.possession != null && stats.possession > 0) present += 1;
  return present / total;
}

function computeTemporalDelta(match: Match, stats: MatchStats): number {
  const history = getPressureScoreHistory(match.id);
  if (history.length >= 2) {
    return Math.max(0, history[history.length - 1] - history[history.length - 2]);
  }

  const rolling = computeRollingWindowStats(match);
  return clamp(
    rolling.shotsOnTarget * 2.2 +
      rolling.dangerousAttacks * 0.9 +
      rolling.shots * 0.5 +
      rolling.corners * 0.6,
    0,
    BENCHMARKS.temporalDelta
  );
}

function computeRecentOffensiveBurst(match: Match, stats: MatchStats): number {
  const rolling = computeRollingWindowStats(match);
  return clamp(
    rolling.shotsOnTarget * 3.2 +
      rolling.dangerousAttacks * 1.4 +
      rolling.shots * 0.9 +
      rolling.corners * 1.1 +
      (rolling.xG > 0 ? rolling.xG * 8 : 0),
    0,
    BENCHMARKS.recentBurst
  );
}

function computeMomentumScore(
  match: Match,
  pressureScore: number,
  temporalDelta: number,
  recentBurst: number
): number {
  const history = getPressureScoreHistory(match.id);
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
      : pressureGrowth * 0.55;

  const burstNorm = normalize(recentBurst, BENCHMARKS.recentBurst);
  const deltaNorm = normalize(temporalDelta, BENCHMARKS.temporalDelta);
  const growthNorm = normalize(Math.max(0, pressureGrowth), 12);

  return roundScore(
    acceleration * 0.22 +
      growthNorm * 0.28 +
      deltaNorm * 0.22 +
      burstNorm * 0.18 +
      pressureScore * 0.1
  );
}

function computeOffensiveIntensity(
  stats: MatchStats,
  recentBurst: number,
  possession: number
): number {
  const sot = resolveShotsOnTarget(stats);
  const base =
    sot * 4.5 +
    stats.dangerousAttacks * 1.8 +
    stats.shots * 1.2 +
    resolveCorners(stats) * 1.5 +
    resolveTotalAttacks(stats) * 0.6;

  const burstFactor = normalize(recentBurst, BENCHMARKS.recentBurst) * 0.35;
  const possFactor = normalize(possession, BENCHMARKS.possession) * 0.15;

  return roundScore(normalize(base, 55) * 0.5 + burstFactor + possFactor);
}

function computeGoalProbability(
  pressureScore: number,
  momentum: number,
  xG: number,
  minute: number
): number {
  const minuteFactor =
    minute < 15 ? 0.82 : minute > 85 ? 0.72 : minute > 75 ? 0.88 : 1;
  const xgBoost = normalize(xG, BENCHMARKS.xG);
  const raw = pressureScore * 0.52 + momentum * 0.28 + xgBoost * 20;
  const scaled = clamp(raw * minuteFactor * 0.85, 0, 100);
  return Math.round((scaled / 100) * 1000) / 1000;
}

function computeConfidence(
  completeness: number,
  historyLen: number,
  pressureScore: number
): number {
  const historyBoost = clamp(historyLen / 8, 0, 1) * 0.25;
  const scoreBoost = pressureScore >= 60 ? 0.12 : pressureScore >= 45 ? 0.06 : 0;
  return roundScore((completeness * 0.55 + historyBoost + scoreBoost) * 100) / 100;
}

function buildStatsForSide(side: TeamSideStats): MatchStats {
  return {
    shots: side.shots,
    shotsOnTarget: side.shotsOnTarget,
    dangerousAttacks: side.dangerousAttacks,
    totalAttacks: side.totalAttacks,
    corners: side.corners,
    xG: side.xG,
    possession: side.possession,
  };
}

function splitStatsByPossession(match: Match): MatchTeamStats {
  const poss = resolvePossession(match.stats);
  const homeShare = clamp(poss / 100, 0.35, 0.75);
  const awayShare = 1 - homeShare;

  const split = (value: number, homeRatio: number): { home: number; away: number } => ({
    home: Math.round(value * homeRatio),
    away: Math.max(0, value - Math.round(value * homeRatio)),
  });

  const shots = split(match.stats.shots, homeShare);
  const sot = split(resolveShotsOnTarget(match.stats), homeShare);
  const da = split(match.stats.dangerousAttacks, homeShare);
  const ta = split(resolveTotalAttacks(match.stats), homeShare);
  const corners = split(resolveCorners(match.stats), homeShare);
  const xgTotal = resolveXG(match.stats, resolveShotsOnTarget(match.stats));
  const xg = split(xgTotal, homeShare);

  return {
    home: {
      shots: shots.home,
      shotsOnTarget: sot.home,
      dangerousAttacks: da.home,
      totalAttacks: ta.home,
      corners: corners.home,
      xG: xg.home,
      possession: Math.round(homeShare * 100),
    },
    away: {
      shots: shots.away,
      shotsOnTarget: sot.away,
      dangerousAttacks: da.away,
      totalAttacks: ta.away,
      corners: corners.away,
      xG: xg.away,
      possession: Math.round(awayShare * 100),
    },
  };
}

function resolveTeamStats(match: Match): MatchTeamStats {
  if (match.teamStats) return match.teamStats;
  return splitStatsByPossession(match);
}

// ─── Core API ────────────────────────────────────────────────────────────────

/**
 * Calcula o Pressure Score ofensivo agregado (0–100) com momentum, intensidade,
 * probabilidade de gol e confiança. Usa fallbacks quando dados estão ausentes.
 */
export function calculatePressureScore(
  match: Match,
  options?: CalculatePressureOptions
): QuantitativePressureResult {
  const stats = options?.statsOverride ?? match.stats;
  const matchId = options?.matchIdOverride ?? match.id;
  const minute = options?.minuteOverride ?? match.minute;

  const syntheticMatch: Match = {
    ...match,
    id: matchId,
    minute,
    stats,
  };

  const sot = resolveShotsOnTarget(stats);
  const totalAttacks = resolveTotalAttacks(stats);
  const xG = resolveXG(stats, sot);
  const possession = resolvePossession(stats);
  const corners = resolveCorners(stats);
  const temporalDelta = computeTemporalDelta(syntheticMatch, stats);
  const recentBurst = computeRecentOffensiveBurst(syntheticMatch, stats);

  const components = {
    shotsOnTarget: normalize(sot, BENCHMARKS.shotsOnTarget) * WEIGHTS.shotsOnTarget,
    dangerousAttacks:
      normalize(stats.dangerousAttacks, BENCHMARKS.dangerousAttacks) *
      WEIGHTS.dangerousAttacks,
    recentOffensiveBurst:
      normalize(recentBurst, BENCHMARKS.recentBurst) * WEIGHTS.recentOffensiveBurst,
    totalAttacks:
      normalize(totalAttacks, BENCHMARKS.totalAttacks) * WEIGHTS.totalAttacks,
    shots: normalize(stats.shots, BENCHMARKS.shots) * WEIGHTS.shots,
    xG: normalize(xG, BENCHMARKS.xG) * WEIGHTS.xG,
    corners: normalize(corners, BENCHMARKS.corners) * WEIGHTS.corners,
    possession: normalize(possession, BENCHMARKS.possession) * WEIGHTS.possession,
    temporalDelta:
      normalize(temporalDelta, BENCHMARKS.temporalDelta) * WEIGHTS.temporalDelta,
  };

  const weightedSum = Object.values(components).reduce((a, b) => a + b, 0);
  const rawEquivalent = (weightedSum / 100) * NORMALIZATION_RAW_CAP;
  const pressureScore = roundScore((rawEquivalent / NORMALIZATION_RAW_CAP) * 100);

  const momentum = computeMomentumScore(
    syntheticMatch,
    pressureScore,
    temporalDelta,
    recentBurst
  );
  const offensiveIntensity = computeOffensiveIntensity(
    stats,
    recentBurst,
    possession
  );
  const goalProbability = computeGoalProbability(
    pressureScore,
    momentum,
    xG,
    minute
  );
  const completeness = dataCompleteness(stats);
  const historyLen = getPressureScoreHistory(matchId).length;
  const confidence =
    computeConfidence(completeness, historyLen, pressureScore) / 100;

  if (!options?.skipTickRecord) {
    recordMatchTick(matchId, minute, stats, pressureScore);
  }

  return {
    pressureScore,
    momentum,
    offensiveIntensity,
    goalProbability,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

/** Pressure por lado (casa / fora) + agregado do fixture. */
export function calculateFixtureTeamPressures(match: Match): FixtureTeamPressure {
  const teams = resolveTeamStats(match);
  const aggregate = calculatePressureScore(match, { skipTickRecord: true });

  const home = calculatePressureScore(match, {
    skipTickRecord: true,
    statsOverride: buildStatsForSide(teams.home),
    matchIdOverride: `${match.id}:home`,
    minuteOverride: match.minute,
  });

  const away = calculatePressureScore(match, {
    skipTickRecord: true,
    statsOverride: buildStatsForSide(teams.away),
    matchIdOverride: `${match.id}:away`,
    minuteOverride: match.minute,
  });

  return {
    home: home.pressureScore,
    away: away.pressureScore,
    aggregate,
  };
}

/** Aplica resultado quantitativo no snapshot `match.pressure`. */
export function applyQuantitativePressureToMatch(match: Match): Match {
  const result = calculatePressureScore(match);
  const previous = match.pressure?.score ?? result.pressureScore;
  const delta = result.pressureScore - previous;

  return {
    ...match,
    pressure: {
      score: result.pressureScore,
      tier:
        result.pressureScore >= 80
          ? "high"
          : result.pressureScore >= 60
            ? "medium"
            : "low",
      trend: delta >= 2 ? "RISING" : delta <= -2 ? "FALLING" : "STABLE",
      capturedAt: Date.now(),
    },
  };
}
