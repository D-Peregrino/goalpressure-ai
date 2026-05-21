/**
 * GoalPressure AI — microevent detection types.
 */

export type MicroeventTriggerWindow = "30s" | "60s" | "120s" | "300s";

export interface MicroeventPressureContext {
  pressureScore: number;
  momentum: number;
  offensiveIntensity: number;
  goalProbability: number;
  confidence: number;
  homePressure?: number;
  awayPressure?: number;
}

export interface MicroeventTemporalContext {
  chaosIndex: number;
  urgencyMultiplier: number;
  accelerationScore: number;
  volatilityScore: number;
  executionPriority: string;
  matchPhase: string;
}

export interface MicroeventPlayerContext {
  offensiveImpact: number;
  chaosContribution: number;
  substitutionSwing: number;
  clutchFactor: number;
  redCardImpact: number;
  flags: string[];
}

export interface MicroeventDetectionInput {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  pressure: MicroeventPressureContext;
  temporal?: MicroeventTemporalContext;
  player?: MicroeventPlayerContext;
  attacks: number;
  dangerousAttacks: number;
  corners: number;
  shots: number;
  shotsOnTarget: number;
  possessionSwing: number;
  substitutions: number;
  yellowCards: number;
  redCards: number;
  xgAcceleration: number;
}

export interface MicroeventDetectionResult {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  territorialDominance: number;
  sequencePressure: number;
  attackWaveIntensity: number;
  chaosBurst: number;
  transitionThreat: number;
  flankOverload: number;
  counterAttackRisk: number;
  setPieceDanger: number;
  emotionalTilt: number;
  collapseProbability: number;
  microeventScore: number;
  triggerWindow: MicroeventTriggerWindow;
  flags: string[];
  computedAt: string;
}

export interface MicroeventMetricsRow {
  id?: string;
  fixture_id: string;
  minute: number;
  territorial_dominance: number;
  sequence_pressure: number;
  attack_wave_intensity: number;
  chaos_burst: number;
  transition_threat: number;
  flank_overload: number;
  counter_attack_risk: number;
  set_piece_danger: number;
  emotional_tilt: number;
  collapse_probability: number;
  microevent_score: number;
  trigger_window: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
