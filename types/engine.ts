import type { MarketType, Match, Signal, SignalConfidence } from "@/types/domain";

/** Quantitative pressure band (MVP V1 classification) */
export type PressureLevel =
  | "IGNORE"
  | "MONITOR"
  | "MODERATE_ENTRY"
  | "STRONG_ENTRY";

export interface PressureTriggerReason {
  code: string;
  label: string;
  weight: number;
  score: number;
}

export interface PressureScoreResult {
  score: number;
  confidence: SignalConfidence | null;
  level: PressureLevel;
  triggerReasons: PressureTriggerReason[];
  components: Record<string, number>;
  rollingWindowMinutes: number;
}

export interface LiveMomentumResult {
  acceleration: number;
  pressureGrowth: number;
  territorialDominance: number;
  offensiveBurst: number;
  momentumScore: number;
  flags: string[];
}

export interface ExpectedValueResult {
  probability: number;
  fairOdd: number;
  edge: number;
  evPercent: number;
  impliedProbability: number;
}

export interface MatchEngineInsight {
  matchId: string;
  matchLabel: string;
  minute: number;
  pressure: PressureScoreResult;
  momentum: LiveMomentumResult;
  expectedValue: {
    over05: ExpectedValueResult;
    over15: ExpectedValueResult;
  };
  strongestMarket: MarketType | null;
}

export interface LiveEngineSnapshot {
  updatedAt: string;
  matchCount: number;
  activeSignals: number;
  strongestPressure: MatchEngineInsight | null;
  highestMomentum: MatchEngineInsight | null;
  insights: MatchEngineInsight[];
  signals: Signal[];
  queueSize: number;
  /** Execution & Distribution Layer snapshot */
  dispatch?: import("@/lib/execution/execution.types").DispatchEngineSnapshot;
}

export interface LiveEngineProcessResult {
  matches: Match[];
  signals: Signal[];
  snapshot: LiveEngineSnapshot;
}

export interface RollingWindowStats {
  shots: number;
  shotsOnTarget: number;
  dangerousAttacks: number;
  corners: number;
  xG: number;
  possession: number;
  windowMinutes: number;
  estimated: boolean;
}

export interface ExtendedMatchStats {
  shots: number;
  shotsOnTarget: number;
  dangerousAttacks: number;
  corners: number;
  xG: number;
  possession: number;
}

export type EnrichedMatch = Match & {
  engineStats?: ExtendedMatchStats;
};
