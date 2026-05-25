import type { MarketType } from "@/types/domain";
import type {
  DistortionLevel,
  EvConfidenceClass,
  EvMarketCalc,
} from "@/lib/engine/ev/ev.types";
import { calculateConfidenceScore } from "@/lib/engine/ev/calculateConfidenceScore";
import { calculateMarketDistortion } from "@/lib/engine/ev/calculateMarketDistortion";
import { probabilityToFairOdd } from "@/lib/engine/ev/calculateFairOdds";

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/**
 * EV = (prob_real * odd_mercado) - 1
 * prob_real em 0–1 derivada de probabilityPercent 0–100
 */
export function calculateExpectedValue(
  probabilityPercent: number,
  marketOdd: number,
  options?: {
    market?: MarketType;
    confidenceScore?: number;
    confidenceClass?: EvConfidenceClass;
    distortionLevel?: DistortionLevel;
    distortionPercent?: number;
  }
): Pick<
  EvMarketCalc,
  | "probability"
  | "fairOdds"
  | "marketOdds"
  | "expectedValue"
  | "evPercent"
  | "evRaw"
  | "edge"
  | "distortionLevel"
  | "distortionPercent"
  | "confidenceScore"
  | "confidenceClass"
> {
  const prob = clamp(probabilityPercent, 5, 95) / 100;
  const market = Math.max(1.01, marketOdd);
  const fairOdd = probabilityToFairOdd(probabilityPercent);
  const distortion = calculateMarketDistortion(market, fairOdd);
  const evRaw = prob * market - 1;
  const evPercent = evRaw * 100;
  const edge = market / fairOdd - 1;

  return {
    probability: Math.round(probabilityPercent),
    fairOdds: fairOdd,
    marketOdds: Math.round(market * 100) / 100,
    expectedValue: Math.round(evRaw * 1000) / 1000,
    evPercent: Math.round(evPercent * 10) / 10,
    evRaw: Math.round(evRaw * 1000) / 1000,
    edge: Math.round(edge * 1000) / 1000,
    distortionLevel: options?.distortionLevel ?? distortion.level,
    distortionPercent: options?.distortionPercent ?? distortion.percent,
    confidenceScore: options?.confidenceScore ?? 50,
    confidenceClass: options?.confidenceClass ?? "MEDIUM",
  };
}
