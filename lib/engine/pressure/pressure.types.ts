import type { Match, Signal } from "@/types/domain";

/** Classificação visual do score ofensivo (0–100). */
export type PressureClassification =
  | "LOW"
  | "MEDIUM"
  | "HIGH"
  | "VERY_HIGH"
  | "EXTREME";

/** Ritmo ofensivo recente. */
export type MomentumClassification = "WEAK" | "GROWING" | "STRONG" | "EXPLOSIVE";

export type OffensiveSignalType =
  | "OVER_0_5_LIVE"
  | "OVER_1_5_LIVE"
  | "LATE_GOAL"
  | "PRESSURE_SPIKE"
  | "CORNER_ACCELERATION";

export interface PressureScoreComponents {
  dangerousAttacks: number;
  shotsOnTarget: number;
  recentShots: number;
  recentCorners: number;
  possessionDominance: number;
  attackAcceleration: number;
}

export interface OffensiveSignalCandidate {
  type: OffensiveSignalType;
  strength: number;
  label: string;
  reason: string;
}

export interface OffensivePressureResult {
  fixtureId: string;
  minute: number;
  pressureScore: number;
  momentumScore: number;
  momentumClass: MomentumClassification;
  territorialScore: number;
  accelerationScore: number;
  classification: PressureClassification;
  components: PressureScoreComponents;
  signals: OffensiveSignalCandidate[];
  statsJson: Record<string, unknown>;
}

export interface RunOffensivePressureOptions {
  previousScore?: number;
  skipTickRecord?: boolean;
  skipPersistence?: boolean;
}

export interface LivePressureWorkerResult {
  matches: Match[];
  signals: Signal[];
  results: OffensivePressureResult[];
  snapshotsPersisted: number;
}
