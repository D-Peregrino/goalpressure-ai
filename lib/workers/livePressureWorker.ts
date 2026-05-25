/**
 * Worker live — recalcula pressão ofensiva, sinais e snapshots Supabase.
 * Server-side only; debounce leve por fixture.
 */

import {
  applyOffensivePressureToMatch,
  runOffensivePressureEngine,
} from "@/lib/engine/pressure/runOffensivePressureEngine";
import {
  offensiveSignalToMarket,
} from "@/lib/engine/pressure/calculateSignalStrength";
import { persistPressureSnapshots } from "@/lib/engine/pressure/livePressureSnapshotPersistence";
import {
  markSignalEmitted,
  validateSignalAntiSpam,
} from "@/lib/engine/signals/signalAntiSpam";
import { calculatePressureScore as legacyPressure } from "@/lib/engine/pressure/pressureCalculator";
import { calculateExpectedValue } from "@/lib/engine/ev/expectedValue";
import type {
  LivePressureWorkerResult,
  OffensivePressureResult,
} from "@/lib/engine/pressure/pressure.types";
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

function offensiveResultToSignal(
  match: Match,
  result: OffensivePressureResult
): Signal | null {
  const top = result.signals[0];
  if (!top) return null;

  const market = offensiveSignalToMarket(top.type);
  if (!market) {
    return {
      matchId: match.id,
      matchLabel: getMatchLabel(match),
      market: "OVER_0_5",
      confidence: deriveSignalConfidence(result.pressureScore) ?? "MEDIUM",
      reason: `${top.label} · ${top.reason}`,
      stake: deriveStake(deriveSignalConfidence(result.pressureScore) ?? "MEDIUM"),
      pressureScore: result.pressureScore,
      odd: match.odds.primary,
    };
  }

  const odd = market === "OVER_0_5" ? match.odds.over05 : match.odds.over15;
  const confidence = deriveSignalConfidence(result.pressureScore);
  if (!confidence) return null;

  const pressure = legacyPressure(match, { skipTickRecord: true });
  const ev = calculateExpectedValue(market, odd, pressure, {
    momentumScore: result.momentumScore,
  });
  const spam = validateSignalAntiSpam({
    matchId: match.id,
    market,
    pressure,
    ev,
    requirePositiveEv: false,
  });
  if (!spam.allowed) return null;

  markSignalEmitted(match.id, market);

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

/**
 * Processa batch de jogos ao vivo: engine → match state → sinais → snapshots.
 */
export async function runLivePressureWorker(
  matches: Match[]
): Promise<LivePressureWorkerResult> {
  const results: OffensivePressureResult[] = [];
  const enriched: Match[] = [];
  const signals: Signal[] = [];

  for (const match of matches) {
    const fixtureId = match.externalId ?? match.id;
    const skipDebounce = matches.length <= 3;
    if (!skipDebounce && !shouldProcessFixture(fixtureId)) {
      enriched.push(match);
      continue;
    }

    const result = runOffensivePressureEngine(match, {
      previousScore: match.pressure?.score,
    });
    results.push(result);

    const updated = applyOffensivePressureToMatch(match, result, {
      previousScore: match.pressure?.score,
    });
    enriched.push(updated);

    const signal = offensiveResultToSignal(updated, result);
    if (signal) signals.push(signal);
  }

  const snapshotsPersisted = await persistPressureSnapshots(results);

  logInfo(LOG_SCOPE, "Worker batch complete", {
    matches: matches.length,
    processed: results.length,
    signals: signals.length,
    snapshotsPersisted,
  });

  return {
    matches: enriched,
    signals,
    results,
    snapshotsPersisted,
  };
}
