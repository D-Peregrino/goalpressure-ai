/**
 * GoalPressure AI — meta consensus types.
 */

export type ExecutionGrade = "D" | "C" | "B" | "A" | "S" | "S+";

export type ExecutionDecision =
  | "IGNORE"
  | "WATCH"
  | "PREPARE"
  | "EXECUTE"
  | "AGGRESSIVE_EXECUTE";

export interface MetaEngineScores {
  pressure: number;
  temporal: number;
  playerImpact: number;
  microevent: number;
  sequenceMemory: number;
  marketCalibration: number;
  signalReadiness: number;
  backtestConfidence: number;
}

export interface MetaConsensusInput {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  engines: MetaEngineScores;
  penalties: {
    fakeMomentum: number;
    edgeInconsistent: boolean;
    excessVolatility: number;
    lowHistoricalConfidence: number;
    engineConflict: number;
  };
  rewards: {
    fullAlignment: boolean;
    persistence: number;
    sustainedChaos: number;
    marketLag: boolean;
    dominanceCycle: number;
  };
  flags: string[];
}

export interface MetaConsensusResult {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  consensusScore: number;
  institutionalConfidence: number;
  executionGrade: ExecutionGrade;
  triggerApproval: boolean;
  marketAgreement: number;
  contextualAlignment: number;
  edgePersistence: number;
  volatilityRisk: number;
  falsePositiveRisk: number;
  consensusFlags: string[];
  dominantEngines: string[];
  executionDecision: ExecutionDecision;
  computedAt: string;
}

export interface MetaConsensusMetricsRow {
  id?: string;
  fixture_id: string;
  minute: number;
  consensus_score: number;
  institutional_confidence: number;
  execution_grade: string;
  trigger_approval: boolean;
  market_agreement: number;
  contextual_alignment: number;
  edge_persistence: number;
  volatility_risk: number;
  false_positive_risk: number;
  execution_decision: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
