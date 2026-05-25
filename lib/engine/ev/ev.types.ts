import type { MarketType } from "@/types/domain";
import type { OffensivePressureResult } from "@/lib/engine/pressure/pressure.types";

export type DistortionLevel = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export type EvConfidenceClass = "LOW" | "MEDIUM" | "HIGH" | "ELITE";

export type EvSignalType =
  | "EV_OVER_0_5"
  | "EV_OVER_1_5"
  | "EV_LATE_GOAL"
  | "EV_CORNERS"
  | "EV_PRESSURE_BREAK";

export interface ProprietaryXgResult {
  live: number;
  trend: number;
  pressure: number;
}

export interface GoalProbabilities {
  oneGoal: number;
  twoPlusGoals: number;
  lateGoal: number;
  overLive: number;
  over05: number;
  over15: number;
}

export interface EvMarketCalc {
  market: MarketType | EvSignalType;
  probability: number;
  fairOdds: number;
  marketOdds: number;
  expectedValue: number;
  evPercent: number;
  evRaw: number;
  edge: number;
  distortionLevel: DistortionLevel;
  distortionPercent: number;
  confidenceScore: number;
  confidenceClass: EvConfidenceClass;
}

export interface RankedEvSignal extends EvMarketCalc {
  signalType: EvSignalType;
  rankScore: number;
  label: string;
}

export interface MatchEvEngine {
  probabilityGoal: number;
  probabilities: GoalProbabilities;
  expectedGoals: ProprietaryXgResult;
  fairOdds: { over05: number; over15: number; primary: number };
  marketOdds: { over05: number; over15: number; primary: number };
  expectedValue: {
    over05: EvMarketCalc;
    over15: EvMarketCalc;
    best: EvMarketCalc | null;
  };
  distortion: {
    level: DistortionLevel;
    percent: number;
    marketVsFair: number;
  };
  confidence: {
    score: number;
    class: EvConfidenceClass;
  };
  rankedSignals: RankedEvSignal[];
}

export interface EvEngineInput {
  match: import("@/types/domain").Match;
  pressure: OffensivePressureResult;
}

export interface EvEngineResult {
  fixtureId: string;
  evEngine: MatchEvEngine;
  rankedSignals: RankedEvSignal[];
}
