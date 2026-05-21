/**
 * GoalPressure AI — Live Validation Lab types.
 * Validação quantitativa contínua (sem novos motores de sinal).
 */

import type { ExecutionDecision, ExecutionGrade } from "@/types/meta";
import type { MarketType } from "@/types/domain";

export type ValidationReliability = "LOW" | "MEDIUM" | "HIGH";

export type CalibrationSuggestionAction =
  | "INCREASE_MIN_PRESSURE"
  | "REDUCE_CHAOS_SENSITIVITY"
  | "INCREASE_CONFIDENCE_THRESHOLD"
  | "INCREASE_MIN_EV"
  | "BLOCK_LEAGUE"
  | "TIGHTEN_TRIGGER_WINDOW"
  | "REDUCE_TELEGRAM_COOLDOWN"
  | "INCREASE_META_THRESHOLD";

export interface CalibrationSuggestion {
  id: string;
  action: CalibrationSuggestionAction;
  priority: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  detail: string;
  metric: string;
  currentValue?: number | string;
  suggestedValue?: number | string;
}

export interface ValidationSegmentRow {
  label: string;
  total: number;
  wins: number;
  losses: number;
  pending: number;
  hitRate: number;
  roi: number;
  profitUnits: number;
  averageEv: number;
}

export interface ValidationPerformanceBreakdown {
  byExecutionGrade: ValidationSegmentRow[];
  byLeague: ValidationSegmentRow[];
  byMarket: ValidationSegmentRow[];
  byTriggerWindow: ValidationSegmentRow[];
  byChaosLevel: ValidationSegmentRow[];
  byTemporalPhase: ValidationSegmentRow[];
  byPressureRange: ValidationSegmentRow[];
  byConfidenceRange: ValidationSegmentRow[];
}

export interface FalsePositiveCase {
  dispatchId: string;
  fixtureId: string;
  market: string;
  category:
    | "FAILED_SIGNAL"
    | "FAKE_MOMENTUM"
    | "FALSE_EDGE"
    | "UNPRODUCTIVE_PRESSURE"
    | "CHAOS_NO_CONVERSION";
  minute: number;
  pressureScore: number;
  momentum: number;
  ev: number;
  executionGrade?: ExecutionGrade;
  detail: string;
}

export interface FalsePositiveAnalysis {
  failedSignals: FalsePositiveCase[];
  fakeMomentum: FalsePositiveCase[];
  falseEdge: FalsePositiveCase[];
  unproductivePressure: FalsePositiveCase[];
  chaosNoConversion: FalsePositiveCase[];
  totalFlagged: number;
}

export interface MarketEfficiencyAnalysis {
  closingLineEfficiency: number;
  edgePersistence: number;
  steamReactionScore: number;
  oddsLagScore: number;
  samples: number;
}

export interface EngineAccuracyRow {
  engine: string;
  totalAttributed: number;
  wins: number;
  hitRate: number;
  roi: number;
  profitUnits: number;
}

export interface EngineConflictRow {
  fixtureId: string;
  conflictScore: number;
  dominantEngines: string[];
  outcome: "WIN" | "LOSS" | "PENDING";
}

export interface EngineConsensusAnalysis {
  engineAccuracy: EngineAccuracyRow[];
  dominantEnginesRoi: ValidationSegmentRow[];
  engineConflicts: EngineConflictRow[];
}

export interface TelegramPerformanceAnalysis {
  dispatchesSent: number;
  dispatchesBlocked: number;
  dispatchesQueued: number;
  conversionRate: number;
  roiPerDispatch: number;
  spamRatio: number;
  cooldownEfficiency: number;
  profitUnits: number;
}

export interface LiveValidationInput {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  league?: string;
  minute: number;
  market?: MarketType;
  pressureScore: number;
  momentum: number;
  confidence: number;
  ev: number;
  chaosLevel: number;
  temporalPhase: string;
  triggerWindow: string;
  executionGrade?: ExecutionGrade;
  executionDecision?: ExecutionDecision;
  falsePositiveRisk: number;
  dominantEngines: string[];
  fakeMomentumProbability: number;
  edgePersistence: number;
  marketLag: boolean;
  engineConflict: number;
  usableForSignal: boolean;
}

export interface LiveValidationResult {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  validationScore: number;
  falsePositiveRisk: number;
  reliability: ValidationReliability;
  segmentTags: string[];
  flags: string[];
  usableForCalibration: boolean;
  computedAt: string;
}

export interface ValidationLabSnapshot {
  updatedAt: string;
  source: "live" | "historical" | "hybrid";
  tradeCount: number;
  hitRate: number;
  roi: number;
  profitUnits: number;
  averageEv: number;
  performance: ValidationPerformanceBreakdown;
  falsePositives: FalsePositiveAnalysis;
  marketEfficiency: MarketEfficiencyAnalysis;
  engineConsensus: EngineConsensusAnalysis;
  telegramPerformance: TelegramPerformanceAnalysis;
  calibrationSuggestions: CalibrationSuggestion[];
  live: LiveValidationResult[];
}

export interface ValidationMetricsRow {
  id?: string;
  fixture_id: string;
  minute: number;
  validation_score: number;
  false_positive_risk: number;
  reliability: string;
  segment_tags: string[];
  metadata: Record<string, unknown>;
  created_at?: string;
}

export interface ValidationSnapshotRow {
  id?: string;
  snapshot_type: string;
  trade_count: number;
  hit_rate: number;
  roi: number;
  profit_units: number;
  lab_payload: ValidationLabSnapshot;
  suggestions: CalibrationSuggestion[];
  created_at?: string;
}
