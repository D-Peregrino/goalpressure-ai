/**
 * Ciclo de calibração de mercado — integrado ao runtime live (não bloqueante).
 */

import type { Match } from "@/types/domain";
import type { MarketType } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import type { RuntimeActiveSignal } from "@/lib/runtime/signalDispatcher";
import { calibrateMarketEdge } from "@/lib/market/marketCalibrationEngine";
import { temporalMarketEdgeAdjustment } from "@/lib/temporal/temporalDynamicsEngine";
import { getTemporalDynamicsForFixture } from "@/lib/temporal/temporalSnapshot";
import { getPlayerImpactForFixture } from "@/lib/player/playerSnapshot";
import { playerMarketEdgeBoost } from "@/lib/player/playerImpactEngine";
import {
  detectSteamMove,
  recordMarketOdd,
} from "@/lib/market/marketEdgeTracker";
import { persistMarketCalibrationBatch } from "@/lib/market/marketPersistence";
import { buildMarketOpsSnapshot } from "@/lib/market/marketSnapshot";
import type { MarketEdgeCalibration } from "@/types/market";
import { logOps } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "market-calibration-cycle";

const LIVE_MARKETS: MarketType[] = ["OVER_0_5", "OVER_1_5"];

function resolveMarketOdd(match: Match, market: MarketType): number {
  return market === "OVER_0_5" ? match.odds.over05 : match.odds.over15;
}

function findActiveSignal(
  fixtureId: string,
  market: MarketType,
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
 * Calibra edges para cada fixture×mercado do ciclo live.
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

    for (const market of LIVE_MARKETS) {
      const marketOdd = resolveMarketOdd(match, market);
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

      calibrations.push(cal);

      if (cal.classification !== "IGNORE") {
        logOps(
          LOG_SCOPE,
          `[market-calibration] fixture=${fixtureId} market=${market} edge=${cal.edgePercent}% EV=${cal.expectedValue} class=${cal.classification} mispricing=${cal.marketMispricingScore}`
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
