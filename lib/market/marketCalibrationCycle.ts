/**
 * Ciclo de calibração de mercado — integrado ao runtime live (não bloqueante).
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import type { RuntimeActiveSignal } from "@/lib/runtime/signalDispatcher";
import { calibrateMarketEdge } from "@/lib/market/marketCalibrationEngine";
import { temporalMarketEdgeAdjustment } from "@/lib/temporal/temporalDynamicsEngine";
import { getTemporalDynamicsForFixture } from "@/lib/temporal/temporalSnapshot";
import { getPlayerImpactForFixture } from "@/lib/player/playerSnapshot";
import { playerMarketEdgeBoost } from "@/lib/player/playerImpactEngine";
import { getMicroeventForFixture } from "@/lib/microevent/microeventSnapshot";
import { microeventMarketEdgeBoost } from "@/lib/microevent/microeventEngine";
import { getSequenceMemoryForFixture } from "@/lib/sequence/sequenceSnapshot";
import { sequenceMarketEdgeBoost } from "@/lib/sequence/sequenceMemoryEngine";
import {
  detectSteamMove,
  recordMarketOdd,
} from "@/lib/market/marketEdgeTracker";
import { persistMarketCalibrationBatch } from "@/lib/market/marketPersistence";
import { buildMarketOpsSnapshot } from "@/lib/market/marketSnapshot";
import type { MarketEdgeCalibration } from "@/types/market";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";
import { getCalibrationQuotes } from "@/lib/mappers/normalizeSportmonksOdds";

const LOG_SCOPE = "market-calibration-cycle";

function findActiveSignal(
  fixtureId: string,
  market: string,
  activeSignals: RuntimeActiveSignal[]
): RuntimeActiveSignal | undefined {
  return activeSignals.find(
    (s) => s.fixtureId === fixtureId && s.market === market
  );
}

export interface ProcessMarketCalibrationInput {
  matches: Match[];
  metrics: LiveMetricRecord[];
  activeSignals?: RuntimeActiveSignal[];
}

export interface ProcessMarketCalibrationResult {
  calibrated: number;
  persisted: number;
  snapshot: ReturnType<typeof buildMarketOpsSnapshot>;
}

/**
 * Calibra edges para cada fixture×mercado do ciclo live (odds bet365 reais).
 */
export async function processMarketCalibrationCycle(
  input: ProcessMarketCalibrationInput
): Promise<ProcessMarketCalibrationResult> {
  const metricByFixture = new Map(
    input.metrics.map((m) => [m.fixtureId, m])
  );
  const calibrations: MarketEdgeCalibration[] = [];

  for (const match of input.matches) {
    const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
    const metric = metricByFixture.get(fixtureId);
    if (!metric) continue;

    const quotes = getCalibrationQuotes(match);
    if (quotes.length === 0) continue;

    for (const quote of quotes) {
      const market = String(quote.marketCode);
      const marketOdd = quote.odd;
      if (marketOdd < 1.01) continue;

      const { previousOdd, openingOdd } = recordMarketOdd(
        fixtureId,
        market,
        marketOdd
      );

      const active = findActiveSignal(
        fixtureId,
        market,
        input.activeSignals ?? []
      );

      const cal = calibrateMarketEdge({
        fixtureId,
        matchId: match.id,
        matchLabel: metric.matchLabel,
        market,
        minute: match.minute,
        pressure: {
          pressureScore: metric.pressureScore,
          momentum: metric.momentum,
          goalProbability: metric.goalProbability,
          confidence: metric.confidence,
          offensiveIntensity: metric.offensiveIntensity,
        },
        signal: active
          ? {
              ev: active.ev,
              signalConfidence: active.confidence,
              triggered: true,
            }
          : undefined,
        marketOdd,
        impliedProbability: quote.impliedProbability,
        previousMarketOdd: previousOdd,
        openingMarketOdd: openingOdd,
      });

      if (detectSteamMove(fixtureId, market)) {
        cal.steamMove = true;
      }

      const temporal = getTemporalDynamicsForFixture(fixtureId);
      if (temporal) {
        cal.edge = temporalMarketEdgeAdjustment(temporal, cal.edge);
        cal.edgePercent = Math.round(cal.edge * 10000) / 100;
        if (temporal.flags.includes("MARKET_LAG")) {
          cal.steamMove = cal.steamMove || temporal.volatilityScore > 60;
        }
      }

      const playerImpact = getPlayerImpactForFixture(fixtureId);
      if (playerImpact) {
        cal.edge += playerMarketEdgeBoost(playerImpact);
        cal.edgePercent = Math.round(cal.edge * 10000) / 100;
        if (playerImpact.substitutionSwing >= 30) {
          cal.steamMove = true;
        }
      }

      const microevent = getMicroeventForFixture(fixtureId);
      if (microevent) {
        cal.edge += microeventMarketEdgeBoost(microevent);
        cal.edgePercent = Math.round(cal.edge * 10000) / 100;
        if (
          microevent.triggerWindow === "30s" ||
          microevent.triggerWindow === "60s"
        ) {
          cal.steamMove = cal.steamMove || microevent.microeventScore >= 65;
        }
      }

      const sequenceMemory = getSequenceMemoryForFixture(fixtureId);
      if (sequenceMemory) {
        cal.edge += sequenceMarketEdgeBoost(sequenceMemory);
        cal.edgePercent = Math.round(cal.edge * 10000) / 100;
        if (sequenceMemory.sequenceState === "ESCALATING") {
          cal.steamMove = cal.steamMove || sequenceMemory.recurrenceScore >= 60;
        }
      }

      calibrations.push(cal);

      if (cal.classification !== "IGNORE") {
        logOps(
          LOG_SCOPE,
          `[market-calibration] fixture=${fixtureId} market=${market} odd=${marketOdd} edge=${cal.edgePercent}% EV=${cal.expectedValue} class=${cal.classification} mispricing=${cal.marketMispricingScore}`
        );
      }
    }
  }

  const persist = await persistMarketCalibrationBatch(calibrations);
  const snapshot = buildMarketOpsSnapshot(calibrations);

  await recordRuntimeOpsLog({
    event: "market_calibration_cycle",
    message: `[market-calibration] calibrated=${calibrations.length} avgEdge=${snapshot.averageEdge}`,
    metadata: {
      calibrated: calibrations.length,
      averageEdge: snapshot.averageEdge,
      strongest: snapshot.strongestEdge?.fixtureId,
      steamMoves: snapshot.steamMoves,
    },
  });

  logOps(LOG_SCOPE, "[market-calibration] cycle complete", {
    calibrated: calibrations.length,
    persisted: persist.edgesPersisted,
    averageEdge: snapshot.averageEdge,
    strongestEdge: snapshot.strongestEdge?.edge,
  });

  return {
    calibrated: calibrations.length,
    persisted: persist.edgesPersisted,
    snapshot,
  };
}
