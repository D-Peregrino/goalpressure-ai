/**
 * Realtime signal persistence — Supabase signals with 90s dedup window.
 */

import { createHash } from "crypto";
import type { Signal } from "@/types/domain";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SignalRow } from "@/lib/supabase/types";
import { logInfo, logWarn } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "live-signal-persistence";
const DEDUP_WINDOW_MS = 90_000;

const recentFingerprints = new Map<string, number>();

function buildFingerprint(
  fixtureId: string,
  market: string,
  confidence: string
): string {
  return `${fixtureId}|${market}|${confidence}`;
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
  return nowMs - last < DEDUP_WINDOW_MS;
}

function mapSignalToRow(
  signal: Signal,
  modelId: string,
  fixtureId: string,
  signalId: string,
  triggerMinute?: number
): SignalRow {
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
    home_team: signal.matchLabel.split(" vs ")[0],
    away_team: signal.matchLabel.split(" vs ")[1] ?? "",
    trigger_minute: triggerMinute ?? null,
    metadata: { reason: signal.reason, source: "live_polling" },
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

/**
 * Persists live signals with dedup: same fixture + market + confidence within 90s.
 */
export async function persistLiveSignals(
  signals: Signal[],
  modelId: string,
  options?: { minuteByMatchId?: Record<string, number> }
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
    const fingerprint = buildFingerprint(
      fixtureId,
      signal.market,
      signal.confidence
    );

    if (isDuplicate(fingerprint, nowMs)) {
      skippedDuplicate += 1;
      await recordRuntimeOpsLog({
        event: "signal_dedup_skipped",
        message: `Signal dedup skipped: ${fingerprint}`,
        metadata: { fixtureId, market: signal.market },
      });
      continue;
    }

    const signalId = buildSignalId(signal, modelId, fixtureId);
    const row = mapSignalToRow(
      signal,
      modelId,
      fixtureId,
      signalId,
      options?.minuteByMatchId?.[signal.matchId]
    );

    try {
      await insertSignalCloud(row);
      recentFingerprints.set(fingerprint, nowMs);
      persisted += 1;

      await recordRuntimeOpsLog({
        event: "supabase_upsert_success",
        message: `Signal persisted: ${signalId}`,
        metadata: { table: "signals", signalId, modelId },
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(LOG_SCOPE, "Signal persist failed", { signalId, message });
      await recordRuntimeOpsLog({
        event: "supabase_upsert_fail",
        message: `Signal upsert failed: ${message}`,
        level: "error",
        metadata: { signalId },
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
