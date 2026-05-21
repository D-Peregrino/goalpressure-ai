/**
 * GoalPressure AI — market calibration types.
 */

import type { MarketType } from "@/types/domain";

export type MarketEdgeClassification =
  | "IGNORE"
  | "WATCHLIST"
  | "EV_PLUS"
  | "STRONG_EDGE"
  | "INSTITUTIONAL_EDGE";

export interface MarketPressureMetrics {
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  confidence: number;
  offensiveIntensity?: number;
}

export interface MarketSignalMetrics {
  ev?: number;
  fairOdd?: number;
  signalConfidence?: number;
  triggered?: boolean;
}

export interface CalibrateMarketEdgeInput {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  market: MarketType | string;
  minute?: number;
  pressure: MarketPressureMetrics;
  signal?: MarketSignalMetrics;
  marketOdd: number;
  /** Probabilidade implícita explícita (opcional — senão 1/odd) */
  impliedProbability?: number;
  /** Odd anterior para drift / steam */
  previousMarketOdd?: number;
  /** Odd de abertura / referência */
  openingMarketOdd?: number;
}

export interface MarketEdgeCalibration {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  market: string;
  proprietaryProbability: number;
  impliedProbability: number;
  edge: number;
  edgePercent: number;
  fairOdd: number;
  marketOdd: number;
  expectedValue: number;
  confidence: number;
  marketMispricingScore: number;
  classification: MarketEdgeClassification;
  closingLineDelta?: number;
  oddsDrift?: number;
  steamMove?: boolean;
  sharpPressure?: number;
  minute?: number;
  computedAt: string;
}

export interface MarketEdgeRow {
  id?: string;
  fixture_id: string;
  market: string;
  proprietary_probability: number;
  implied_probability: number;
  edge: number;
  edge_percent: number;
  fair_odd: number;
  market_odd: number;
  expected_value: number;
  confidence: number;
  mispricing_score: number;
  classification: string;
  closing_line_delta?: number | null;
  odds_drift?: number | null;
  steam_move?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface MarketSnapshotRow {
  id?: string;
  fixture_id: string;
  market: string;
  snapshot_type: string;
  market_odd: number;
  proprietary_probability: number;
  implied_probability: number;
  edge: number;
  expected_value: number;
  mispricing_score: number;
  closing_line_delta?: number | null;
  odds_drift?: number | null;
  steam_move?: boolean;
  sharp_pressure?: number | null;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
