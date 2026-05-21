/**
 * GoalPressure AI — avaliação de resultado por sinal (OVER_0_5 / OVER_1_5).
 */

import type { MarketType, MatchScore } from "@/types/domain";
import type { BacktestTradeResult } from "@/types/backtest";

export const BACKTEST_STAKE_UNITS = 1;

const SUPPORTED_MARKETS: MarketType[] = ["OVER_0_5", "OVER_1_5"];

export interface EvaluateSignalInput {
  dispatchId: string;
  fixtureId: string;
  market: string;
  marketOdd: number;
  ev: number;
  pressureScore: number;
  momentum: number;
  confidence: number;
  goalsAtTrigger: number;
  goalsAtResolution: number | null;
  triggerMinute: number;
  createdAt: string;
  matchFinished: boolean;
}

export interface SignalEvaluationOutcome {
  market: MarketType;
  outcome: "WIN" | "LOSS" | "PENDING";
  newGoalsAfterTrigger: number;
  profitUnits: number;
  roi: number;
  realizedEv: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function isSupportedBacktestMarket(market: string): market is MarketType {
  return SUPPORTED_MARKETS.includes(market as MarketType);
}

export function totalGoals(score: MatchScore | null): number {
  if (!score) return 0;
  return score.home + score.away;
}

/**
 * Verifica se houve gol(s) após o trigger conforme o mercado.
 */
export function evaluateGoalOutcome(
  market: MarketType,
  goalsAtTrigger: number,
  goalsAtResolution: number
): { outcome: "WIN" | "LOSS"; newGoalsAfterTrigger: number } {
  const newGoals = Math.max(0, goalsAtResolution - goalsAtTrigger);

  if (market === "OVER_0_5") {
    return {
      outcome: newGoals >= 1 ? "WIN" : "LOSS",
      newGoalsAfterTrigger: newGoals,
    };
  }

  return {
    outcome: newGoals >= 2 ? "WIN" : "LOSS",
    newGoalsAfterTrigger: newGoals,
  };
}

/**
 * ROI por unidade de stake fixa (1u): WIN = odd - 1, LOSS = -1.
 */
export function calculateTradeRoi(outcome: "WIN" | "LOSS", odd: number): number {
  const safeOdd = clamp(odd, 1.01, 50);
  return outcome === "WIN" ? round4(safeOdd - 1) : -1;
}

/**
 * EV realizado ≈ (probabilidade implícita do resultado × odd) − 1.
 */
export function calculateRealizedEv(
  outcome: "WIN" | "LOSS",
  odd: number
): number {
  const impliedResultProb = outcome === "WIN" ? 1 : 0;
  return round4(impliedResultProb * clamp(odd, 1.01, 50) - 1);
}

/**
 * Avalia um dispatch histórico contra placar final.
 */
export function evaluateSignalResult(
  input: EvaluateSignalInput
): SignalEvaluationOutcome | null {
  if (!isSupportedBacktestMarket(input.market)) {
    return null;
  }

  const market = input.market;

  if (!input.matchFinished || input.goalsAtResolution === null) {
    return {
      market,
      outcome: "PENDING",
      newGoalsAfterTrigger: 0,
      profitUnits: 0,
      roi: 0,
      realizedEv: 0,
    };
  }

  const { outcome, newGoalsAfterTrigger } = evaluateGoalOutcome(
    market,
    input.goalsAtTrigger,
    input.goalsAtResolution
  );

  const roi = calculateTradeRoi(outcome, input.marketOdd);
  const profitUnits = round4(roi * BACKTEST_STAKE_UNITS);
  const realizedEv = calculateRealizedEv(outcome, input.marketOdd);

  return {
    market,
    outcome,
    newGoalsAfterTrigger,
    profitUnits,
    roi,
    realizedEv,
  };
}

/**
 * Converte avaliação em registro de trade institucional.
 */
export function toBacktestTradeResult(
  input: EvaluateSignalInput,
  evaluation: SignalEvaluationOutcome
): BacktestTradeResult {
  return {
    dispatchId: input.dispatchId,
    fixtureId: input.fixtureId,
    market: evaluation.market,
    odd: input.marketOdd,
    ev: input.ev,
    pressureScore: input.pressureScore,
    momentum: input.momentum,
    confidence: input.confidence,
    goalsAtTrigger: input.goalsAtTrigger,
    goalsAtResolution: input.goalsAtResolution ?? 0,
    newGoalsAfterTrigger: evaluation.newGoalsAfterTrigger,
    outcome: evaluation.outcome,
    profitUnits: evaluation.profitUnits,
    roi: evaluation.roi,
    realizedEv: evaluation.realizedEv,
    triggerMinute: input.triggerMinute,
    createdAt: input.createdAt,
  };
}
