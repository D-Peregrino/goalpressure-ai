import type { MarketType } from "@/types/domain";

/** Threshold rules for Over 0.5 market */
export interface Over05MarketRules {
  minMinute: number;
  minPressure: number;
  maxMinute: number;
  minDangerousAttacks: number;
  minOdd: number;
}

/** Threshold rules for Over 1.5 market */
export interface Over15MarketRules {
  minMinute: number;
  minPressure: number;
  maxMinute: number;
  minDangerousAttacks: number;
  minShots: number;
  minOdd: number;
}

export type MarketRules = Over05MarketRules | Over15MarketRules;

export interface QuantitativeModelMarkets {
  OVER_0_5: Over05MarketRules;
  OVER_1_5: Over15MarketRules;
}

/** Versioned quantitative model configuration */
export interface QuantitativeModel {
  modelId: string;
  createdAt: string;
  description: string;
  markets: QuantitativeModelMarkets;
}

/** Pointer to the active model file in config/models/ */
export interface ActiveModelManifest {
  activeModelId: string;
}

export interface LoadedActiveModel {
  model: QuantitativeModel;
  usedFallback: boolean;
  requestedModelId: string;
}

export function isMarketType(value: string): value is MarketType {
  return (
    value === "OVER_0_5" ||
    value === "OVER_1_5" ||
    value === "OVER_2_5" ||
    value === "BTTS" ||
    value === "FULL_TIME_RESULT"
  );
}
