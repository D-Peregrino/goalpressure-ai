/**
 * GoalPressure AI — Temporal Dynamics Engine institucional.
 * Modela impacto do tempo no valor ofensivo, EV e comportamento de mercado.
 */

import type {
  ExecutionPriority,
  FavoriteStatus,
  MatchPhase,
  TemporalDynamicsInput,
  TemporalDynamicsResult,
} from "@/types/temporal";
import type { MatchScore } from "@/types/domain";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

export function resolveMatchPhase(minute: number): MatchPhase {
  if (minute <= 25) return "EARLY";
  if (minute <= 60) return "MID";
  if (minute <= 85) return "LATE";
  return "STOPPAGE";
}

function totalGoals(score?: MatchScore): number {
  if (!score) return 0;
  return score.home + score.away;
}

function isDraw(score?: MatchScore): boolean {
  if (!score) return false;
  return score.home === score.away;
}

function favoriteLosing(
  status: FavoriteStatus,
  score?: MatchScore
): boolean {
  if (!score || status === "NEUTRAL" || status === "UNKNOWN") return false;
  if (status === "HOME") return score.home < score.away;
  return score.away < score.home;
}

function totalRedCards(home: number, away: number): number {
  return Math.max(0, home) + Math.max(0, away);
}

/**
 * Fase do jogo — multiplicadores de urgência e janela de gol.
 */
function phaseWeights(phase: MatchPhase): {
  urgencyBase: number;
  scoringBoost: number;
  lateGoalBoost: number;
  exhaustion: number;
} {
  switch (phase) {
    case "EARLY":
      return { urgencyBase: 0.85, scoringBoost: 0.08, lateGoalBoost: 0.05, exhaustion: 0.1 };
    case "MID":
      return { urgencyBase: 1.0, scoringBoost: 0.18, lateGoalBoost: 0.12, exhaustion: 0.35 };
    case "LATE":
      return { urgencyBase: 1.35, scoringBoost: 0.32, lateGoalBoost: 0.38, exhaustion: 0.72 };
    case "STOPPAGE":
      return { urgencyBase: 1.55, scoringBoost: 0.28, lateGoalBoost: 0.45, exhaustion: 0.85 };
  }
}

/**
 * Detecta chaos / desperation / dead game.
 */
export function detectTemporalFlags(input: TemporalDynamicsInput): string[] {
  const flags: string[] = [];
  const phase = resolveMatchPhase(input.minute);
  const goals = totalGoals(input.scoreline);
  const red = totalRedCards(input.homeRedCards ?? 0, input.awayRedCards ?? 0);
  const xgUp = (input.xgDelta ?? 0) > 0.15;

  if (phase === "LATE" || phase === "STOPPAGE") {
    if (input.momentum >= 55 && input.pressureScore >= 65) flags.push("LATE_SURGE");
    if (favoriteLosing(input.favoriteStatus ?? "UNKNOWN", input.scoreline)) {
      flags.push("FAVORITE_DESPERATION");
    }
    if (isDraw(input.scoreline) && input.minute >= 70) flags.push("DRAW_LATE_PUSH");
  }

  if (red > 0) flags.push("RED_CARD_CHAOS");
  if (xgUp && input.minute >= 50) flags.push("XG_ACCELERATION");

  if (
    input.pressureScore < 35 &&
    input.momentum < 20 &&
    input.minute >= 55 &&
    goals >= 2
  ) {
    flags.push("DEAD_GAME");
  }

  if (
    input.pressureScore >= 70 &&
    input.momentum >= 50 &&
    (input.marketEdge ?? 0) > 0.03 &&
    phase === "LATE"
  ) {
    flags.push("CHAOS_PHASE");
  }

  if ((input.marketEdge ?? 0) > 0.04 && input.momentum < input.pressureScore * 0.4) {
    flags.push("MARKET_LAG");
  }

  if (
    input.pressureScore >= 75 &&
    input.momentum >= 45 &&
    favoriteLosing(input.favoriteStatus ?? "UNKNOWN", input.scoreline)
  ) {
    flags.push("DESPERATION_PHASE");
  }

  return flags;
}

function computeChaosIndex(
  input: TemporalDynamicsInput,
  flags: string[]
): number {
  let score = 0;
  const phase = resolveMatchPhase(input.minute);

  if (flags.includes("CHAOS_PHASE")) score += 28;
  if (flags.includes("DESPERATION_PHASE")) score += 22;
  if (flags.includes("RED_CARD_CHAOS")) score += 18;
  if (flags.includes("FAVORITE_DESPERATION")) score += 15;
  if (flags.includes("DRAW_LATE_PUSH")) score += 12;
  if (flags.includes("LATE_SURGE")) score += 14;
  if (flags.includes("MARKET_LAG")) score += 10;
  if (flags.includes("DEAD_GAME")) score -= 25;

  score += clamp(input.momentum * 0.25, 0, 20);
  score += clamp((input.pressureScore - 50) * 0.2, 0, 15);
  if (phase === "LATE" || phase === "STOPPAGE") score += 12;

  return roundScore(score);
}

function computeMarketLagFactor(
  input: TemporalDynamicsInput,
  flags: string[]
): number {
  const edge = input.marketEdge ?? 0;
  let lag = clamp(edge * 8, 0, 0.6);

  if (flags.includes("MARKET_LAG")) lag += 0.15;
  if (flags.includes("CHAOS_PHASE") && edge > 0.02) lag += 0.1;
  if (resolveMatchPhase(input.minute) === "LATE") lag += 0.05;

  return round3(clamp(lag, 0, 1));
}

function computeExecutionPriority(
  chaosIndex: number,
  urgencyMultiplier: number,
  scoringWindowProbability: number,
  flags: string[]
): ExecutionPriority {
  if (flags.includes("DEAD_GAME")) return "LOW";
  if (chaosIndex >= 75 && scoringWindowProbability >= 0.65) return "CRITICAL";
  if (chaosIndex >= 55 || urgencyMultiplier >= 1.4) return "HIGH";
  if (scoringWindowProbability >= 0.45 || urgencyMultiplier >= 1.1) return "MEDIUM";
  return "LOW";
}

/**
 * Calcula dinâmica temporal institucional para um fixture ao vivo.
 */
export function calculateTemporalDynamics(
  input: TemporalDynamicsInput
): TemporalDynamicsResult {
  const minute = clamp(Math.floor(input.minute), 0, 120);
  const phase = resolveMatchPhase(minute);
  const phaseW = phaseWeights(phase);
  const flags = detectTemporalFlags({ ...input, minute });

  const goals = totalGoals(input.scoreline);
  const draw = isDraw(input.scoreline);
  const favLosing = favoriteLosing(
    input.favoriteStatus ?? "UNKNOWN",
    input.scoreline
  );
  const red = totalRedCards(input.homeRedCards ?? 0, input.awayRedCards ?? 0);
  const xgDelta = input.xgDelta ?? 0;

  let urgencyMultiplier = phaseW.urgencyBase;
  urgencyMultiplier += (input.momentum / 100) * 0.35;
  if (phase === "LATE" || phase === "STOPPAGE") urgencyMultiplier += 0.2;
  if (favLosing) urgencyMultiplier += 0.18;
  if (draw && minute >= 65) urgencyMultiplier += 0.12;
  if (red > 0) urgencyMultiplier += 0.08 * red;
  if (flags.includes("DEAD_GAME")) urgencyMultiplier *= 0.55;
  urgencyMultiplier = round3(clamp(urgencyMultiplier, 0.5, 2));

  let scoringWindowProbability =
    input.goalProbability * 0.5 +
    (input.pressureScore / 100) * 0.25 +
    phaseW.scoringBoost;

  if (favLosing) scoringWindowProbability += 0.08;
  if (draw && minute >= 60) scoringWindowProbability += 0.06;
  if (xgDelta > 0.1) scoringWindowProbability += xgDelta * 0.15;
  if (red > 0) scoringWindowProbability += 0.05;
  scoringWindowProbability = round3(clamp(scoringWindowProbability, 0, 0.95));

  let lateGoalProbability =
    phaseW.lateGoalBoost +
    (minute >= 70 ? (minute - 70) / 50 : 0) * 0.25 +
    input.goalProbability * 0.2;

  if (phase === "STOPPAGE") lateGoalProbability += 0.12;
  if (favLosing && minute >= 75) lateGoalProbability += 0.1;
  lateGoalProbability = round3(clamp(lateGoalProbability, 0, 0.92));

  const exhaustionFactor = round3(
    clamp(phaseW.exhaustion + (minute / 90) * 0.15, 0, 1)
  );

  const chaosIndex = computeChaosIndex(input, flags);
  const marketLagFactor = computeMarketLagFactor(input, flags);

  const accelerationScore = roundScore(
    input.momentum * 0.45 +
      (input.pressureScore - 50) * 0.35 +
      xgDelta * 40 +
      (flags.includes("XG_ACCELERATION") ? 15 : 0)
  );

  const volatilityScore = roundScore(
    chaosIndex * 0.5 +
      Math.abs(input.marketEdge ?? 0) * 200 +
      (flags.includes("RED_CARD_CHAOS") ? 20 : 0) +
      (phase === "LATE" || phase === "STOPPAGE" ? 15 : 5)
  );

  const temporalPressure = roundScore(
    input.pressureScore * urgencyMultiplier * 0.55 +
      accelerationScore * 0.25 +
      chaosIndex * 0.2
  );

  const executionPriority = computeExecutionPriority(
    chaosIndex,
    urgencyMultiplier,
    scoringWindowProbability,
    flags
  );

  return {
    fixtureId: input.fixtureId,
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    minute,
    matchPhase: phase,
    temporalPressure,
    urgencyMultiplier,
    scoringWindowProbability,
    lateGoalProbability,
    exhaustionFactor,
    chaosIndex,
    marketLagFactor,
    accelerationScore,
    volatilityScore,
    executionPriority,
    flags,
    computedAt: new Date().toISOString(),
  };
}

/** Multiplicador de urgência para Signal Decision Engine (1 = neutro). */
export function temporalUrgencyBoost(
  temporal: TemporalDynamicsResult
): number {
  switch (temporal.executionPriority) {
    case "CRITICAL":
      return 1.35;
    case "HIGH":
      return 1.2;
    case "MEDIUM":
      return 1.08;
    default:
      return 1;
  }
}

/** Ajuste de edge efetivo para Market Calibration (+lag). */
export function temporalMarketEdgeAdjustment(
  temporal: TemporalDynamicsResult,
  baseEdge: number
): number {
  if (temporal.flags.includes("DEAD_GAME")) return baseEdge * 0.5;
  return round3(baseEdge + temporal.marketLagFactor * 0.02);
}
