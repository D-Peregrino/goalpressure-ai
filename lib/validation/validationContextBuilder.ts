/**
 * Monta input de validação live a partir dos snapshots existentes.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import { getMetaConsensusForFixture } from "@/lib/meta/metaSnapshot";
import { getDataQualityForFixture } from "@/lib/dataQuality/dataQualitySnapshot";
import { getTemporalDynamicsForFixture } from "@/lib/temporal/temporalSnapshot";
import { getSequenceMemoryForFixture } from "@/lib/sequence/sequenceSnapshot";
import { getMarketCalibrationOpsSnapshot } from "@/lib/market/marketSnapshot";
import { resolveMatchPhase } from "@/lib/temporal/temporalDynamicsEngine";
import type { LiveValidationInput } from "@/types/validation";

function triggerWindowLabel(minute: number): string {
  if (minute < 30) return "0-29";
  if (minute < 60) return "30-59";
  if (minute < 80) return "60-79";
  return "80+";
}

export function buildLiveValidationInput(
  match: Match,
  metric: LiveMetricRecord
): LiveValidationInput {
  const fixtureId = metric.fixtureId;
  const meta = getMetaConsensusForFixture(fixtureId);
  const dq = getDataQualityForFixture(fixtureId);
  const temporal = getTemporalDynamicsForFixture(fixtureId);
  const sequence = getSequenceMemoryForFixture(fixtureId);
  const marketSnap = getMarketCalibrationOpsSnapshot();
  const edge = marketSnap?.edges.find((e) => e.fixtureId === fixtureId);

  const minute = match.minute ?? metric.minute ?? 0;
  const chaosLevel =
    sequence?.sustainedChaosLevel ?? temporal?.chaosIndex ?? 0;

  return {
    fixtureId,
    matchId: match.id,
    matchLabel: metric.matchLabel,
    league: match.league,
    minute,
    market: undefined,
    pressureScore: metric.pressureScore,
    momentum: metric.momentum,
    confidence: metric.confidence,
    ev: edge?.expectedValue ?? 0,
    chaosLevel,
    temporalPhase: temporal?.matchPhase ?? resolveMatchPhase(minute),
    triggerWindow: triggerWindowLabel(minute),
    executionGrade: meta?.executionGrade,
    executionDecision: meta?.executionDecision,
    falsePositiveRisk: meta?.falsePositiveRisk ?? 40,
    dominantEngines: meta?.dominantEngines ?? [],
    fakeMomentumProbability: sequence?.fakeMomentumProbability ?? 0,
    edgePersistence: meta?.edgePersistence ?? edge?.edgePercent ?? 0,
    marketLag: meta?.consensusFlags?.includes("MARKET_LAG") ?? false,
    engineConflict: meta?.volatilityRisk ?? 0,
    usableForSignal: dq?.usableForSignal ?? true,
  };
}
