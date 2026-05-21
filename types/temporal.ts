/**
 * GoalPressure AI — temporal dynamics types.
 */

import type { MatchScore, MatchStatus } from "@/types/domain";

export type MatchPhase = "EARLY" | "MID" | "LATE" | "STOPPAGE";

export type ExecutionPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type FavoriteStatus = "HOME" | "AWAY" | "NEUTRAL" | "UNKNOWN";

export interface TemporalDynamicsInput {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  /** Edge vs mercado (0–1 scale, ex: 0.04 = 4%) */
  marketEdge?: number;
  matchState?: MatchStatus;
  scoreline?: MatchScore;
  homeRedCards?: number;
  awayRedCards?: number;
  xgDelta?: number;
  favoriteStatus?: FavoriteStatus;
  stoppageMinutes?: number;
}

export interface TemporalDynamicsResult {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  matchPhase: MatchPhase;
  temporalPressure: number;
  urgencyMultiplier: number;
  scoringWindowProbability: number;
  lateGoalProbability: number;
  exhaustionFactor: number;
  chaosIndex: number;
  marketLagFactor: number;
  accelerationScore: number;
  volatilityScore: number;
  executionPriority: ExecutionPriority;
  flags: string[];
  computedAt: string;
}

export interface TemporalMetricsRow {
  id?: string;
  fixture_id: string;
  minute: number;
  match_phase: string;
  temporal_pressure: number;
  urgency_multiplier: number;
  scoring_window_probability: number;
  late_goal_probability: number;
  exhaustion_factor: number;
  chaos_index: number;
  market_lag_factor: number;
  acceleration_score: number;
  volatility_score: number;
  execution_priority: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
