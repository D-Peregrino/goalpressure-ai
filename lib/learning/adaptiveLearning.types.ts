export type AdaptivePatternId =
  | "pressao_sustentada"
  | "transicao_rapida"
  | "ruptura_ofensiva"
  | "dominio_territorial"
  | "aceleracao_progressiva";

export interface PatternMemoryEntry {
  id: AdaptivePatternId;
  label: string;
  frequency: number;
  effectivenessPct: number;
  likelyOutcome: string;
  lastSeenAt: string;
}

export interface LeagueReliabilityEntry {
  league: string;
  score: number;
  stability: number;
  noise: number;
  predictability: number;
  sampleSize: number;
  label: string;
}

export interface AdaptiveThresholds {
  minContextScore: number;
  minPredictiveBreak: number;
  pressureGate: number;
  autonomousSensitivity: number;
  predictiveSensitivity: number;
  decisionConfidenceCap: number;
}

export interface LearningTimelinePoint {
  at: string;
  contextualPct: number;
  predictivePct: number;
}

export interface AdaptiveLearningMetrics {
  readingsRecorded: number;
  patternsTracked: number;
  leaguesTracked: number;
  enabled: boolean;
  sandboxMode: boolean;
}

export interface AdaptiveLearningSnapshot {
  generatedAt: string;
  contextualAccuracyPct: number;
  predictiveAccuracyPct: number;
  validAnticipations: number;
  falsePositivePct: number;
  marketLagConfirmedPct: number;
  strongPatterns: PatternMemoryEntry[];
  topLeagues: LeagueReliabilityEntry[];
  thresholds: AdaptiveThresholds;
  recentAdjustments: string[];
  timeline: LearningTimelinePoint[];
  metrics: AdaptiveLearningMetrics;
}
