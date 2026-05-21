import type { MarketType } from "@/types/domain";
import type { ExpectedValueResult, PressureScoreResult } from "@/types/engine";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Maps pressure score + market to model probability and expected value vs book odd.
 */
export function calculateExpectedValue(
  market: MarketType,
  bookOdd: number,
  pressure: PressureScoreResult,
  extras?: { xG?: number; momentumScore?: number }
): ExpectedValueResult {
  const impliedProbability = clamp(1 / clamp(bookOdd, 1.01, 20), 0.02, 0.98);

  let baseProbability = 0.35 + (pressure.score / 100) * 0.45;

  if (market === "OVER_0_5") {
    baseProbability += 0.08;
  } else {
    baseProbability += (extras?.xG ?? 0) * 0.06;
    baseProbability += ((extras?.momentumScore ?? 0) / 100) * 0.05;
  }

  if (pressure.level === "STRONG_ENTRY") baseProbability += 0.04;
  else if (pressure.level === "MODERATE_ENTRY") baseProbability += 0.02;

  const probability = clamp(baseProbability, 0.12, 0.92);
  const fairOdd = clamp(1 / probability, 1.01, 15);
  const edge = bookOdd / fairOdd - 1;
  const evPercent = edge * 100;

  return {
    probability: Math.round(probability * 1000) / 1000,
    fairOdd: Math.round(fairOdd * 100) / 100,
    edge: Math.round(edge * 1000) / 1000,
    evPercent: Math.round(evPercent * 10) / 10,
    impliedProbability: Math.round(impliedProbability * 1000) / 1000,
  };
}

export function hasPositiveEV(ev: ExpectedValueResult, minEvPercent = 0.5): boolean {
  return ev.evPercent >= minEvPercent && ev.edge > 0;
}
