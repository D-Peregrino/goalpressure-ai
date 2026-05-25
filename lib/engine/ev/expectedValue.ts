/**
 * Facade legado — delega à EV Engine modular quando possível.
 * Mantém compatibilidade com PressureScoreResult / MarketType.
 */
import type { MarketType } from "@/types/domain";
import type { ExpectedValueResult, PressureScoreResult } from "@/types/engine";
import { calculateExpectedValue as calcEv } from "@/lib/engine/ev/calculateExpectedValue";
import { probabilityToFairOdd } from "@/lib/engine/ev/calculateFairOdds";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * @deprecated Prefer runEvEngine + Match.evEngine. Adapter para pipeline antigo.
 */
export function calculateExpectedValue(
  market: MarketType,
  bookOdd: number,
  pressure: PressureScoreResult,
  extras?: { xG?: number; momentumScore?: number }
): ExpectedValueResult {
  let probability = 35 + (pressure.score / 100) * 45;
  if (market === "OVER_0_5") probability += 8;
  else {
    probability += (extras?.xG ?? 0) * 6;
    probability += ((extras?.momentumScore ?? 0) / 100) * 5;
  }
  if (pressure.level === "STRONG_ENTRY") probability += 4;
  else if (pressure.level === "MODERATE_ENTRY") probability += 2;

  const calc = calcEv(clamp(probability, 12, 92), bookOdd);
  const impliedProbability = clamp(1 / clamp(bookOdd, 1.01, 20), 0.02, 0.98);

  return {
    probability: calc.probability / 100,
    fairOdd: calc.fairOdds,
    edge: calc.edge,
    evPercent: calc.evPercent,
    impliedProbability: Math.round(impliedProbability * 1000) / 1000,
  };
}

export function hasPositiveEV(ev: ExpectedValueResult, minEvPercent = 0.5): boolean {
  return ev.evPercent >= minEvPercent && ev.edge > 0;
}

export { probabilityToFairOdd };
