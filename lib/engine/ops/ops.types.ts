import type { Match } from "@/types/domain";
import type { MatchEvEngine } from "@/lib/engine/ev/ev.types";
import type { OffensivePressureResult } from "@/lib/engine/pressure/pressure.types";

export type GameState =
  | "CONTROLLED"
  | "OPEN_GAME"
  | "CHAOTIC"
  | "LOW_BLOCK"
  | "TRANSITION_HEAVY"
  | "LATE_PRESSURE"
  | "DEAD_GAME"
  | "CORNER_SIEGE"
  | "ONE_WAY_TRAFFIC";

export type PressurePattern =
  | "SUSTAINED_PRESSURE"
  | "REPEATED_ATTACKS"
  | "CORNER_PRESSURE"
  | "MOMENTUM_SPIKE"
  | "PRESSURE_DROP"
  | "COMEBACK_PUSH"
  | "DESPERATION_PRESSURE"
  | "NEUTRAL";

export type ChaosClass = "LOW" | "MEDIUM" | "HIGH" | "EXTREME";

export type MatchTemperature = "COLD" | "WARM" | "HOT" | "IGNITE";

export type RiskContext = "LOW" | "MODERATE" | "HIGH" | "DANGEROUS";

export interface OpsEngineInput {
  match: Match;
  pressure?: OffensivePressureResult;
  ev?: MatchEvEngine;
}

export interface OperationalInsightResult {
  fixtureId: string;
  gameState: GameState;
  pressurePattern: PressurePattern;
  tacticalScenario: string;
  chaosLevel: number;
  chaosClass: ChaosClass;
  temperature: MatchTemperature;
  riskContext: RiskContext;
  narrative: string;
  headline: string;
  focusScore: number;
  conductor: string;
}

export interface OperationalFocusRanking {
  primary: OperationalInsightResult | null;
  secondary: OperationalInsightResult[];
  all: OperationalInsightResult[];
}
