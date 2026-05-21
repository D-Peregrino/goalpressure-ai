/**
 * Realtime signal persistence — Supabase signals with 5min dedup (fixture + market).
 */

import { createHash } from "crypto";
import type { Match, Signal } from "@/types/domain";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SignalRow } from "@/lib/supabase/types";
import { logInfo, logWarn } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";
import { SIGNAL_DEDUP_WINDOW_MS } from "@/lib/engine/signals/signalAntiSpam";
import { calculateProductionPressureRaw } from "@/lib/engine/pressure/productionPressureFormula";

const LOG_SCOPE = "live-signal-persistence";

const recentFingerprints = new Map<string, number>();

function buildFingerprint(fixtureId: string, market: string): string {
  return `${fixtureId}|${market}`;
}

function buildSignalId(
  signal: Signal,
  modelId: string,
  fixtureId: string
): string {
  const hash = createHash("sha256")
    .update(`${fixtureId}|${signal.market}|${modelId}|${Date.now()}`)
    .digest("hex")
    .slice(0, 10);
  return `gp-live-${fixtureId}-${hash}`;
}

function isDuplicate(fingerprint: string, nowMs: number): boolean {
  const last = recentFingerprints.get(fingerprint);
  if (!last) return false;
  return nowMs - last < SIGNAL_DEDUP_WINDOW_MS;
}

function mapSignalToRow(
  signal: Signal,
  modelId: string,
  fixtureId: string,
  signalId: string,
  match?: Match
): SignalRow {
  const rawStats = match
    ? {
        minute: match.minute,
        score: match.score,
        stats: match.stats,
        odds: match.odds,
        pressure_score: signal.pressureScore,
      }
    : { pressure_score: signal.pressureScore };

  return {
    signal_id: signalId,
    model_id: modelId,
    match_id: signal.matchId,
    external_id: fixtureId,
    fixture_id: fixtureId,
    market: signal.market,
    confidence: signal.confidence,
    pressure: signal.pressureScore,
    odd: signal.odd,
    stake: signal.stake,
    status: "PENDING",
    home_team: match?.homeTeam ?? signal.matchLabel.split(" vs ")[0],
    away_team: match?.awayTeam ?? signal.matchLabel.split(" vs ")[1] ?? "",
    league: match?.league,
    trigger_minute: match?.minute ?? null,
    metadata: {
      source: "live_runtime",
      reason: signal.reason,
      raw_stats: rawStats,
      pressure_score: signal.pressureScore,
      roi: null,
    },
    created_at: new Date().toISOString(),
  };
}

async function insertSignalCloud(row: SignalRow): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase unavailable");

  const { error } = await client.from("signals").upsert(row, {
    onConflict: "signal_id",
  });

  if (error) throw new Error(error.message);
}

export interface PersistLiveSignalsResult {
  generated: number;
  persisted: number;
  skippedDuplicate: number;
  failed: number;
}

export async function persistLiveSignals(
  signals: Signal[],
  modelId: string,
  options?: { minuteByMatchId?: Record<string, number>; matchById?: Record<string, Match> }
): Promise<PersistLiveSignalsResult> {
  const nowMs = Date.now();
  let persisted = 0;
  let skippedDuplicate = 0;
  let failed = 0;

  if (!isSupabaseConfigured()) {
    logInfo(LOG_SCOPE, "Signals skipped — Supabase not configured", {
      count: signals.length,
    });
    return {
      generated: signals.length,
      persisted: 0,
      skippedDuplicate: 0,
      failed: 0,
    };
  }

  for (const signal of signals) {
    const fixtureId =
      signal.matchId.replace(/^sm-/, "") || signal.matchId;
    const fingerprint = buildFingerprint(fixtureId, signal.market);

    if (isDuplicate(fingerprint, nowMs)) {
      skippedDuplicate += 1;
      await recordRuntimeOpsLog({
        event: "signal_dedup_skipped",
        message: `Dedup 5m: ${fingerprint}`,
        metadata: { fixtureId, market: signal.market },
      });
      continue;
    }

    const fullMatch = options?.matchById?.[signal.matchId];
    if (fullMatch) {
      signal.pressureScore = calculateProductionPressureRaw(fullMatch).score;
    }

    const signalId = buildSignalId(signal, modelId, fixtureId);
    const row = mapSignalToRow(signal, modelId, fixtureId, signalId, fullMatch);

    try {
      await insertSignalCloud(row);
      recentFingerprints.set(fingerprint, nowMs);
      persisted += 1;

      await recordRuntimeOpsLog({
        event: "supabase_upsert_success",
        message: `Signal persisted: ${signalId}`,
        metadata: { table: "signals", signalId, fixtureId, market: signal.market },
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(LOG_SCOPE, "Signal persist failed", { signalId, message });
      await recordRuntimeOpsLog({
        event: "supabase_upsert_fail",
        message: `Signal upsert failed: ${message}`,
        level: "error",
        metadata: { signalId, fixtureId },
      });
    }
  }

  logInfo(LOG_SCOPE, "Live signals persistence batch", {
    generated: signals.length,
    persisted,
    skippedDuplicate,
    failed,
  });

  return {
    generated: signals.length,
    persisted,
    skippedDuplicate,
    failed,
  };
}
