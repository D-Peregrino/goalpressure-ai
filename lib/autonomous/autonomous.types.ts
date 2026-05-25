import type { Match } from "@/types/domain";

export type MarketRegime =
  | "CALM_MARKET"
  | "AGGRESSIVE_MARKET"
  | "CHAOTIC_MARKET"
  | "LOW_CONVERSION"
  | "HIGH_SCORING"
  | "LATE_GOAL_REGIME";

export type SignalSensitivity =
  | "CONSERVATIVE"
  | "BALANCED"
  | "AGGRESSIVE"
  | "HYPER_AGGRESSIVE";

export type OperationalAggressionMode =
  | "REDUCED"
  | "NORMAL"
  | "ELEVATED"
  | "MAXIMUM";

export type DispatchIntensityDecision =
  | "SKIP"
  | "FEED_ONLY"
  | "HIGH"
  | "CRITICAL"
  | "HERO_PRIMARY";

export interface AdaptiveThresholdSet {
  minPressureScore: number;
  minEvPercent: number;
  minConfidence: number;
  minUrgencyScore: number;
}

export interface MatchAutonomousProfile {
  marketRegime: MarketRegime;
  sensitivity: SignalSensitivity;
  adaptiveThresholds: AdaptiveThresholdSet;
  falsePositiveRisk: number;
  overfittingRisk: number;
  aggressionMode: OperationalAggressionMode;
  dispatchIntensity: DispatchIntensityDecision;
  dispatchApproved: boolean;
  autonomousConfidence: number;
  selfCalibrationNotes: string[];
  regimeChanged: boolean;
  updatedAt: string;
}

export interface AutonomousDecisionInput {
  match: Match;
  globalAccuracy?: number;
  globalFalsePositiveRate?: number;
  leagueSampleSize?: number;
}

export interface AutonomousCoreSnapshot {
  generatedAt: string;
  dominantRegime: MarketRegime;
  sensitivity: SignalSensitivity;
  aggressionMode: OperationalAggressionMode;
  activeThresholds: AdaptiveThresholdSet;
  avgFalsePositiveRisk: number;
  autonomousConfidence: number;
  selfCalibration: string[];
  alerts: AutonomousAlert[];
  profilesByFixture: Record<string, MatchAutonomousProfile>;
}

export type AutonomousAlertType =
  | "REGIME_CHANGED"
  | "EDGE_DROPPED"
  | "VOLATILITY_UP"
  | "CONSERVATIVE_MODE"
  | "AGGRESSIVE_ENV";

export interface AutonomousAlert {
  type: AutonomousAlertType;
  headline: string;
  narrative: string;
  fixtureId?: string;
}
