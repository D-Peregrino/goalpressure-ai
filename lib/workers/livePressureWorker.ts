/**
 * Worker live — pressão ofensiva + EV engine + snapshots Supabase.
 */

import {
  applyOffensivePressureToMatch,
  runOffensivePressureEngine,
} from "@/lib/engine/pressure/runOffensivePressureEngine";
import {
  offensiveSignalToMarket,
} from "@/lib/engine/pressure/calculateSignalStrength";
import { persistPressureSnapshots } from "@/lib/engine/pressure/livePressureSnapshotPersistence";
import { applyEvEngineToMatch, runEvEngine } from "@/lib/engine/ev/runEvEngine";
import { persistEvSignals } from "@/lib/engine/ev/liveEvSignalPersistence";
import { runOperationalIntelligence } from "@/lib/engine/ops/runOperationalIntelligence";
import { persistOperationalInsight } from "@/lib/engine/ops/operationalInsightsPersistence";
import {
  markSignalEmitted,
  validateSignalAntiSpam,
} from "@/lib/engine/signals/signalAntiSpam";
import { calculatePressureScore as legacyPressure } from "@/lib/engine/pressure/pressureCalculator";
import type {
  LivePressureWorkerResult,
  OffensivePressureResult,
} from "@/lib/engine/pressure/pressure.types";
import type { RankedEvSignal } from "@/lib/engine/ev/ev.types";
import type { Match, Signal } from "@/types/domain";
import {
  deriveSignalConfidence,
  deriveStake,
  getMatchLabel,
  getMarketLabel,
} from "@/types/domain";
import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "live-pressure-worker";

const lastRunByFixture = new Map<string, number>();
const DEBOUNCE_MS = 8_000;

function shouldProcessFixture(fixtureId: string): boolean {
  const now = Date.now();
  const last = lastRunByFixture.get(fixtureId) ?? 0;
  if (now - last < DEBOUNCE_MS) return false;
  lastRunByFixture.set(fixtureId, now);
  return true;
}

function evSignalToDomainSignal(match: Match, ranked: RankedEvSignal): Signal | null {
  const confidence =
    ranked.confidenceClass === "ELITE" || ranked.confidenceClass === "HIGH"
      ? "HIGH"
      : ranked.confidenceClass === "MEDIUM"
        ? "MEDIUM"
        : null;
  if (!confidence && ranked.evPercent < 4) return null;

  const market =
    ranked.signalType === "EV_OVER_0_5"
      ? "OVER_0_5"
      : ranked.signalType === "EV_OVER_1_5"
        ? "OVER_1_5"
        : "OVER_0_5";

  const odd = ranked.marketOdds;
  const conf = confidence ?? "MEDIUM";
  const pressure = legacyPressure(match, { skipTickRecord: true });

  const spam = validateSignalAntiSpam({
    matchId: match.id,
    market,
    pressure,
    ev: {
      probability: ranked.probability / 100,
      fairOdd: ranked.fairOdds,
      edge: ranked.edge,
      evPercent: ranked.evPercent,
      impliedProbability: 1 / odd,
    },
    requirePositiveEv: ranked.evPercent >= 2,
  });
  if (!spam.allowed) return null;

  markSignalEmitted(match.id, market);

  return {
    matchId: match.id,
    matchLabel: getMatchLabel(match),
    market,
    confidence: conf,
    reason: `${ranked.label} · EV ${ranked.evPercent.toFixed(1)}% · fair ${ranked.fairOdds.toFixed(2)} vs ${ranked.marketOdds.toFixed(2)} · ${ranked.distortionLevel}`,
    stake: deriveStake(conf),
    pressureScore: match.pressure.score,
    odd,
  };
}

function offensiveResultToSignal(
  match: Match,
  result: OffensivePressureResult
): Signal | null {
  const top = result.signals[0];
  if (!top) return null;

  const market = offensiveSignalToMarket(top.type);
  if (!market) return null;

  const odd = market === "OVER_0_5" ? match.odds.over05 : match.odds.over15;
  const confidence = deriveSignalConfidence(result.pressureScore);
  if (!confidence) return null;

  return {
    matchId: match.id,
    matchLabel: getMatchLabel(match),
    market,
    confidence,
    reason: `${getMarketLabel(market)} · ${top.reason}`,
    stake: deriveStake(confidence),
    pressureScore: result.pressureScore,
    odd,
  };
}

export async function runLivePressureWorker(
  matches: Match[]
): Promise<LivePressureWorkerResult> {
  const results: OffensivePressureResult[] = [];
  const enriched: Match[] = [];
  const signals: Signal[] = [];
  let evSnapshots = 0;
  let opsSnapshots = 0;

  for (const match of matches) {
    const fixtureId = match.externalId ?? match.id;
    const skipDebounce = matches.length <= 3;
    if (!skipDebounce && !shouldProcessFixture(fixtureId)) {
      enriched.push(match);
      continue;
    }

    const pressureResult = runOffensivePressureEngine(match, {
      previousScore: match.pressure?.score,
    });
    results.push(pressureResult);

    let updated = applyOffensivePressureToMatch(match, pressureResult, {
      previousScore: match.pressure?.score,
    });

    const evResult = runEvEngine(updated, pressureResult);
    updated = applyEvEngineToMatch(updated, evResult);
    evSnapshots += await persistEvSignals(evResult.fixtureId, evResult.rankedSignals);

    const opsResult = runOperationalIntelligence(updated, pressureResult);
    updated = opsResult.match;
    if (await persistOperationalInsight(opsResult.insight)) opsSnapshots += 1;

    enriched.push(updated);

    const topEv = evResult.rankedSignals[0];
    const evSig = topEv ? evSignalToDomainSignal(updated, topEv) : null;
    const pressureSig = offensiveResultToSignal(updated, pressureResult);

    if (evSig && (!pressureSig || topEv.evPercent >= 3)) {
      signals.push(evSig);
    } else if (pressureSig) {
      signals.push(pressureSig);
    }
  }

  const snapshotsPersisted = await persistPressureSnapshots(results);

  logInfo(LOG_SCOPE, "Worker batch complete", {
    matches: matches.length,
    processed: results.length,
    signals: signals.length,
    pressureSnapshots: snapshotsPersisted,
    evSnapshots,
    opsSnapshots,
  });

  return {
    matches: enriched,
    signals,
    results,
    snapshotsPersisted,
  };
}
