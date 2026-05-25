import type { MarketType, SignalConfidence } from "@/types/domain";
import type { MatchTemperature } from "@/lib/engine/ops/ops.types";

export type SignalOutcomeResult = "HIT" | "MISS" | "PENDING";

export interface HistoricalSignalOutcome {
  fixtureId: string;
  signalType: string;
  market: MarketType;
  minute: number;
  pressureScore: number;
  evPercent: number | null;
  confidence: number;
  confidenceClass: string | null;
  odd: number;
  outcome: SignalOutcomeResult;
  finalScore: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  temperature: MatchTemperature | null;
  createdAt: string;
}

export interface SignalAccuracySummary {
  totalResolved: number;
  hitRate: number;
  roiTotal: number;
  roiAverage: number;
  realizedEvAverage: number;
  byMarket: Record<string, { hits: number; total: number; hitRate: number; roi: number }>;
  byPressureBand: Record<string, { hits: number; total: number; hitRate: number }>;
  byTemperature: Record<string, { hits: number; total: number; hitRate: number }>;
}

export type RecurringPatternType =
  | "HIGH_PRESSURE_LOW_CONVERSION"
  | "LATE_GOAL_LEAGUE"
  | "HOT_GAME_NO_OVER"
  | "MARKET_TRAP"
  | "FAKE_PRESSURE"
  | "OVERPERFORMING_PRESSURE";

export interface RecurringPattern {
  type: RecurringPatternType;
  label: string;
  description: string;
  strength: number;
  sampleSize: number;
  league?: string;
  team?: string;
}

export interface LeagueBehaviorProfile {
  league: string;
  chaosScore: number;
  conversionScore: number;
  volatilityScore: number;
  pressureReliability: number;
  lateGoalRate: number;
  sampleSize: number;
  label: string;
}

export type TeamProfileType =
  | "AGGRESSIVE_STARTER"
  | "LATE_PRESSURE"
  | "LOW_CONVERSION"
  | "HIGH_CONVERSION"
  | "COMEBACK_TENDENCY"
  | "CORNER_HEAVY"
  | "CHAOTIC_TRANSITION";

export interface TeamBehaviorProfile {
  team: string;
  league: string;
  profile: TeamProfileType;
  label: string;
  score: number;
  sampleSize: number;
}

export interface PressureWeightRecommendation {
  currentWeights: Record<string, number>;
  suggestedWeights: Record<string, number>;
  rationale: string;
  accuracyBefore: number;
  falsePositiveRate: number;
  confidence: number;
}

export interface LateGoalPatternSummary {
  latePressureHitRate: number;
  minute70PlusSignals: number;
  accelerationImpact: number;
  scorelineImpact: Record<string, number>;
  description: string;
}

export interface HistoricalEdgeResult {
  score: number;
  label: string;
  factors: {
    roiHistory: number;
    accuracy: number;
    pressureAlign: number;
    evRealized: number;
  };
  badges: LearningBadge[];
}

export type LearningBadge =
  | "HIGH_HISTORICAL_EDGE"
  | "LEAGUE_FAVORABLE"
  | "TEAM_PROFILE_DETECTED"
  | "HISTORICAL_PATTERN";

export interface LearningDashboardSnapshot {
  generatedAt: string;
  accuracy: SignalAccuracySummary;
  patterns: RecurringPattern[];
  leagues: LeagueBehaviorProfile[];
  teams: TeamBehaviorProfile[];
  weightRecommendation: PressureWeightRecommendation | null;
  lateGoal: LateGoalPatternSummary;
  topMarkets: { market: string; roi: number; hitRate: number; count: number }[];
  falsePositiveRate: number;
}

export interface MatchLearningContext {
  historicalEdge: HistoricalEdgeResult;
  leagueProfile: LeagueBehaviorProfile | null;
  teamProfiles: TeamBehaviorProfile[];
  patterns: RecurringPattern[];
  updatedAt: string;
}
