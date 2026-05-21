/**
 * Hybrid cloud persistence — dual-write to Supabase alongside local JSON.
 * Failures in Supabase never break the local runtime path.
 */

import type { Match } from "@/types/domain";
import type { SignalOutcomeRecord } from "@/lib/storage/signalOutcomeStorage";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  AnalyticsSnapshotRow,
  MatchRow,
  OpsLogRow,
  SignalRow,
} from "@/lib/supabase/types";
import { logInfo, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "cloud-persistence";

export type DualWriteTarget =
  | "signal"
  | "match"
  | "ops_log"
  | "analytics_snapshot";

export interface DualWriteResult {
  target: DualWriteTarget;
  localActive: true;
  cloudAttempted: boolean;
  cloudSuccess: boolean;
  skipped?: boolean;
  error?: string;
}

/**
 * Executes local write first, then best-effort Supabase insert.
 * Cloud errors are logged and swallowed — JSON/local remains authoritative.
 */
export async function executeDualWrite(
  target: DualWriteTarget,
  localWrite: () => Promise<void>,
  cloudWrite: () => Promise<void>
): Promise<DualWriteResult> {
  await localWrite();

  if (!isSupabaseConfigured()) {
    logInfo(LOG_SCOPE, "Fallback local active", {
      target,
      reason: "supabase_not_configured",
    });

    return {
      target,
      localActive: true,
      cloudAttempted: false,
      cloudSuccess: false,
      skipped: true,
    };
  }

  try {
    await cloudWrite();

    logInfo(LOG_SCOPE, "Supabase insert success", { target });

    return {
      target,
      localActive: true,
      cloudAttempted: true,
      cloudSuccess: true,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    logWarn(LOG_SCOPE, "Supabase insert failed", {
      target,
      message,
    });

    logInfo(LOG_SCOPE, "Fallback local active", {
      target,
      reason: "cloud_write_failed",
    });

    return {
      target,
      localActive: true,
      cloudAttempted: true,
      cloudSuccess: false,
      error: message,
    };
  }
}

function mapSignalRecordToRow(
  record: SignalOutcomeRecord,
  modelId?: string
): SignalRow {
  return {
    signal_id: record.signalId,
    model_id: modelId ?? null,
    match_id: record.matchId,
    external_id: record.externalId,
    market: record.market,
    confidence: record.confidence,
    pressure: record.triggerPressure,
    odd: record.triggerOdds,
    roi: record.roi,
    outcome: record.outcome,
    status: record.status,
    stake: record.stake,
    home_team: record.homeTeam,
    away_team: record.awayTeam,
    league: record.league,
    trigger_minute: record.triggerMinute,
    metadata: record.metadata as Record<string, unknown>,
    created_at: record.createdAt,
    resolved_at: record.resolvedAt,
  };
}

function mapMatchToRow(match: Match): MatchRow {
  return {
    external_id: match.externalId ?? match.id,
    home_team: match.homeTeam,
    away_team: match.awayTeam,
    league: match.league,
    minute: match.minute,
    pressure_score: match.pressure.score,
    status: match.status ?? null,
    score: (match.score ?? null) as Record<string, unknown> | null,
    stats: match.stats as unknown as Record<string, unknown>,
    odds: match.odds as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };
}

async function upsertSignalCloud(row: SignalRow): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("signals").upsert(row, {
    onConflict: "signal_id",
  });

  if (error) throw new Error(error.message);
}

async function upsertMatchCloud(row: MatchRow): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("matches").upsert(row, {
    onConflict: "external_id",
  });

  if (error) throw new Error(error.message);
}

async function insertOpsLogCloud(row: OpsLogRow): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("ops_logs").insert(row);
  if (error) throw new Error(error.message);
}

async function insertAnalyticsSnapshotCloud(
  row: AnalyticsSnapshotRow
): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase client unavailable");

  const { error } = await client.from("analytics_snapshots").insert(row);
  if (error) throw new Error(error.message);
}

/**
 * Dual-write a signal outcome record (call after local JSON save).
 */
export async function dualWriteSignal(
  record: SignalOutcomeRecord,
  options?: { modelId?: string; localWrite: () => Promise<void> }
): Promise<DualWriteResult> {
  const row = mapSignalRecordToRow(record, options?.modelId);

  return executeDualWrite(
    "signal",
    options?.localWrite ?? (async () => undefined),
    async () => upsertSignalCloud(row)
  );
}

/**
 * Dual-write a live match snapshot.
 */
export async function dualWriteMatch(
  match: Match,
  localWrite: () => Promise<void>
): Promise<DualWriteResult> {
  const row = mapMatchToRow(match);

  return executeDualWrite("match", localWrite, async () => upsertMatchCloud(row));
}

/**
 * Dual-write an operational log entry.
 */
export async function dualWriteOpsLog(
  entry: OpsLogRow,
  localWrite: () => Promise<void>
): Promise<DualWriteResult> {
  return executeDualWrite("ops_log", localWrite, async () =>
    insertOpsLogCloud(entry)
  );
}

/**
 * Dual-write an analytics JSON payload.
 */
export async function dualWriteAnalyticsSnapshot(
  payload: Record<string, unknown>,
  localWrite: () => Promise<void>,
  generatedAt?: string
): Promise<DualWriteResult> {
  const row: AnalyticsSnapshotRow = {
    payload,
    generated_at: generatedAt ?? new Date().toISOString(),
  };

  return executeDualWrite("analytics_snapshot", localWrite, async () =>
    insertAnalyticsSnapshotCloud(row)
  );
}

/** Fire-and-forget cloud mirror — never blocks or throws to caller. */
export function mirrorSignalToCloudAsync(
  record: SignalOutcomeRecord,
  modelId?: string
): void {
  if (!isSupabaseConfigured()) return;

  void dualWriteSignal(record, {
    modelId,
    localWrite: async () => undefined,
  }).catch(() => undefined);
}

export function mirrorMatchToCloudAsync(match: Match): void {
  if (!isSupabaseConfigured()) return;

  void dualWriteMatch(match, async () => undefined).catch(() => undefined);
}

export function mirrorOpsLogToCloudAsync(entry: OpsLogRow): void {
  if (!isSupabaseConfigured()) return;

  void dualWriteOpsLog(entry, async () => undefined).catch(() => undefined);
}

export function mirrorAnalyticsSnapshotToCloudAsync(
  payload: Record<string, unknown>,
  generatedAt?: string
): void {
  if (!isSupabaseConfigured()) return;

  void dualWriteAnalyticsSnapshot(payload, async () => undefined, generatedAt).catch(
    () => undefined
  );
}
