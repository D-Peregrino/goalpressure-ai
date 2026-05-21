/**
 * GoalPressure AI — sequence memory types.
 */

export type SequenceState =
  | "BUILDING"
  | "STABLE"
  | "ESCALATING"
  | "COLLAPSING"
  | "CHAOTIC"
  | "DEADLOCK";

export interface SequenceHistoryTick {
  minute: number;
  timestamp: string;
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  chaosIndex: number;
  microeventScore: number;
  playerOffensiveImpact: number;
  playerFatigueImpact: number;
  marketEdgePercent: number;
  signalActive: boolean;
}

export interface SequenceMemoryInput {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  pressureHistory: number[];
  temporalHistory: number[];
  microeventHistory: number[];
  playerImpactHistory: number[];
  playerFatigueHistory: number[];
  signalHistory: boolean[];
  marketDriftHistory: number[];
  minuteProgression: number[];
}

export interface SequenceMemoryResult {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  recurringPressurePattern: number;
  pressurePersistence: number;
  offensiveCycleStrength: number;
  collapseCycleProbability: number;
  emotionalRecoveryIndex: number;
  fakeMomentumProbability: number;
  sustainedChaosLevel: number;
  defensiveFatigueCurve: number;
  lateGameDominance: number;
  recurrenceScore: number;
  memoryConfidence: number;
  sequenceState: SequenceState;
  flags: string[];
  computedAt: string;
}

export interface SequenceMemoryMetricsRow {
  id?: string;
  fixture_id: string;
  minute: number;
  recurring_pressure_pattern: number;
  pressure_persistence: number;
  offensive_cycle_strength: number;
  collapse_cycle_probability: number;
  emotional_recovery_index: number;
  fake_momentum_probability: number;
  sustained_chaos_level: number;
  defensive_fatigue_curve: number;
  late_game_dominance: number;
  recurrence_score: number;
  memory_confidence: number;
  sequence_state: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
