/**
 * GoalPressure AI — Data Quality Engine institucional.
 */

import type {
  DataQualityInput,
  DataQualityResult,
  DataReliability,
} from "@/types/dataQuality";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundScore(n: number): number {
  return Math.round(clamp(n, 0, 100));
}

function resolveReliability(score: number): DataReliability {
  if (score >= 72) return "HIGH";
  if (score >= 48) return "MEDIUM";
  return "LOW";
}

/**
 * Valida qualidade dos dados de um fixture para uso em sinais institucionais.
 */
export function validateDataQuality(input: DataQualityInput): DataQualityResult {
  const missingFields: string[] = [];
  let score = 100;

  if (!input.hasMinute || input.minute <= 0) {
    missingFields.push("minute");
    score -= 25;
  }
  if (!input.hasOdds) {
    missingFields.push("odds");
    score -= 20;
  }
  if (!input.hasStats) {
    missingFields.push("stats");
    score -= 18;
  }
  if (input.shots === 0 && input.dangerousAttacks === 0) {
    missingFields.push("zero_stats");
    score -= 15;
  }
  if (!input.hasXG) {
    missingFields.push("xg");
    score -= 8;
  }
  if (!input.scoreConsistent) {
    missingFields.push("score_inconsistent");
    score -= 12;
  }
  if (input.duplicateFixture) {
    missingFields.push("duplicate_fixture");
    score -= 30;
  }

  let staleRisk = 0;
  if (input.staleAgeMs != null && input.staleAgeMs > 120_000) {
    staleRisk = roundScore(Math.min(100, (input.staleAgeMs - 120_000) / 3000));
    score -= staleRisk * 0.35;
    missingFields.push("stale_data");
  }
  if (input.apiDelayMs != null && input.apiDelayMs > 8000) {
    score -= 10;
    missingFields.push("api_delay");
  }

  const dataQualityScore = roundScore(score);
  const reliability = resolveReliability(dataQualityScore);

  const flags: string[] = [];
  if (missingFields.includes("stale_data")) flags.push("STALE");
  if (missingFields.includes("api_delay")) flags.push("API_DELAY");
  if (missingFields.includes("duplicate_fixture")) flags.push("DUPLICATE");
  if (missingFields.includes("zero_stats")) flags.push("ZERO_STATS");
  if (dataQualityScore >= 70) flags.push("DATA_RELIABLE");

  const usableForSignal =
    dataQualityScore >= 55 &&
    reliability !== "LOW" &&
    !input.duplicateFixture &&
    input.hasMinute &&
    input.hasOdds &&
    staleRisk < 70;

  return {
    fixtureId: input.fixtureId,
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    minute: input.minute,
    dataQualityScore,
    missingFields,
    staleRisk,
    reliability,
    usableForSignal,
    flags,
    computedAt: new Date().toISOString(),
  };
}
