import type { Match, PressureTrend } from "@/types/domain";
import { calculateAttackAcceleration } from "@/lib/engine/pressure/calculateAttackAcceleration";
import { calculateMomentum } from "@/lib/engine/pressure/calculateMomentum";
import { calculatePressureScore } from "@/lib/engine/pressure/calculatePressureScore";
import {
  calculateSignalStrength,
  type SignalEngineInput,
} from "@/lib/engine/pressure/calculateSignalStrength";
import { calculateTerritorialPressure } from "@/lib/engine/pressure/calculateTerritorialPressure";
import {
  classificationToTier,
  classifyPressure,
} from "@/lib/engine/pressure/classifyPressure";
import type {
  OffensivePressureResult,
  RunOffensivePressureOptions,
} from "@/lib/engine/pressure/pressure.types";
import { recordMatchTick } from "@/lib/engine/pressure/rollingWindow";
import { logEngineMetric } from "@/lib/engine/pressure/engineLogger";

function resolveTrend(previous: number, current: number): PressureTrend {
  const delta = current - previous;
  if (delta >= 2) return "RISING";
  if (delta <= -2) return "FALLING";
  return "STABLE";
}

function fixtureIdFromMatch(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

/**
 * Pipeline completo da primeira engine real de pressão ofensiva.
 */
export function runOffensivePressureEngine(
  match: Match,
  options?: RunOffensivePressureOptions
): OffensivePressureResult {
  const accelerationScore = calculateAttackAcceleration(match);
  const { score: pressureScore, components } = calculatePressureScore(
    match,
    accelerationScore
  );
  const { score: momentumScore, classification: momentumClass } =
    calculateMomentum(match, pressureScore, accelerationScore);
  const territorialScore = calculateTerritorialPressure(match);
  const classification = classifyPressure(pressureScore);

  const signalInput: SignalEngineInput = {
    match,
    pressureScore,
    momentumScore,
    accelerationScore,
    territorialScore,
  };
  const signals = calculateSignalStrength(signalInput);

  if (!options?.skipTickRecord) {
    recordMatchTick(match.id, match.minute, match.stats, pressureScore);
  }

  const result: OffensivePressureResult = {
    fixtureId: fixtureIdFromMatch(match),
    minute: match.minute,
    pressureScore,
    momentumScore,
    momentumClass,
    territorialScore,
    accelerationScore,
    classification,
    components,
    signals,
    statsJson: {
      shots: match.stats.shots,
      shotsOnTarget: match.stats.shotsOnTarget,
      dangerousAttacks: match.stats.dangerousAttacks,
      corners: match.stats.corners,
      possession: match.stats.possession ?? null,
      xG: match.stats.xG ?? null,
    },
  };

  const topSignal = signals[0];
  logEngineMetric({
    fixture: result.fixtureId,
    score: pressureScore,
    momentum: momentumScore,
    acceleration: accelerationScore,
    territorial: territorialScore,
    classification,
    signal: topSignal?.type ?? null,
  });

  return result;
}

/** Aplica resultado da engine no objeto Match (pressure + metadados). */
export function applyOffensivePressureToMatch(
  match: Match,
  result: OffensivePressureResult,
  options?: RunOffensivePressureOptions
): Match {
  const previous =
    options?.previousScore ?? match.pressure?.score ?? result.pressureScore;

  return {
    ...match,
    pressure: {
      score: result.pressureScore,
      tier: classificationToTier(result.classification),
      trend: resolveTrend(previous, result.pressureScore),
      capturedAt: Date.now(),
    },
    feedMeta: {
      hasStatistics: match.feedMeta?.hasStatistics ?? false,
      hasInplayOdds: match.feedMeta?.hasInplayOdds ?? false,
      hasEvents: match.feedMeta?.hasEvents ?? false,
      hasLineups: match.feedMeta?.hasLineups ?? false,
      hasXg: match.feedMeta?.hasXg ?? false,
      eventCount: match.feedMeta?.eventCount ?? 0,
      premiumStatsActive: match.feedMeta?.premiumStatsActive ?? false,
      pressureTrend: match.pressure.trend,
      steamMove: match.feedMeta?.steamMove,
      oddsDrift: match.feedMeta?.oddsDrift,
      offensiveEngine: {
        classification: result.classification,
        momentumScore: result.momentumScore,
        momentumClass: result.momentumClass,
        territorialScore: result.territorialScore,
        accelerationScore: result.accelerationScore,
        activeSignals: result.signals.map((s) => s.type),
      },
    },
  };
}
