/**
 * GoalPressure AI — data quality types.
 */

export type DataReliability = "LOW" | "MEDIUM" | "HIGH";

export interface DataQualityInput {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  hasMinute: boolean;
  hasOdds: boolean;
  hasStats: boolean;
  hasXG: boolean;
  shots: number;
  dangerousAttacks: number;
  corners: number;
  possession?: number;
  scoreConsistent: boolean;
  duplicateFixture: boolean;
  apiDelayMs?: number;
  staleAgeMs?: number;
  updatedAt?: number;
}

export interface DataQualityResult {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  dataQualityScore: number;
  missingFields: string[];
  staleRisk: number;
  reliability: DataReliability;
  usableForSignal: boolean;
  flags: string[];
  computedAt: string;
}

export interface DataQualityMetricsRow {
  id?: string;
  fixture_id: string;
  minute: number;
  data_quality_score: number;
  missing_fields: string[];
  stale_risk: number;
  reliability: string;
  usable_for_signal: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
