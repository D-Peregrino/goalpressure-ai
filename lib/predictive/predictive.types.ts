export type PredictiveLevel =
  | "estavel"
  | "aceleracao"
  | "pre_ruptura"
  | "ruptura_iminente"
  | "exaustao_ofensiva";

export type PredictiveTrendDirection = "mandante" | "visitante" | "equilibrado";

export interface PredictiveTimelinePoint {
  minute: number;
  projectedPressure: number;
}

export interface PredictiveReading {
  fixtureId: string;
  matchId: string;
  matchLabel: string;
  minute: number;
  level: PredictiveLevel;
  levelLabel: string;
  goalPressureProbability: number;
  offensiveAcceleration: number;
  collapseRisk: number;
  contextualBreakProbability: number;
  marketLagScore: number;
  contextualProbability: number;
  defensiveRisk: number;
  ruptureRisk: number;
  prePressureActive: boolean;
  marketLagActive: boolean;
  trendDirection: PredictiveTrendDirection;
  trendLabel: string;
  narrative: string;
  projection: PredictiveTimelinePoint[];
  generatedAt: string;
}

export interface PredictiveEngineMetrics {
  predictiveReadings: number;
  contextualHits: number;
  falsePositives: number;
  validAnticipations: number;
  sandboxMode: boolean;
  enabled: boolean;
}

export interface PredictiveEngineSnapshot {
  generatedAt: string;
  readings: PredictiveReading[];
  metrics: PredictiveEngineMetrics;
}
