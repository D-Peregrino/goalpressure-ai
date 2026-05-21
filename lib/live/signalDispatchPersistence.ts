/**
 * Persistência Supabase — signal_dispatches (decision engine + Telegram outcome).
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { SignalDispatchRow } from "@/lib/supabase/types";
import { logInfo, logWarn } from "@/lib/utils/logger";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";

const LOG_SCOPE = "signal-dispatch-persistence";

export interface PersistSignalDispatchInput {
  fixtureId: string;
  market: string;
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  confidence: number;
  ev: number;
  fairOdd: number;
  marketOdd: number;
  triggered: boolean;
  telegramSent: boolean;
  metadata?: Record<string, unknown>;
}

export interface PersistSignalDispatchResult {
  persisted: number;
  failed: number;
  cloudEnabled: boolean;
}

function mapToRow(input: PersistSignalDispatchInput): SignalDispatchRow {
  return {
    fixture_id: input.fixtureId,
    market: input.market,
    pressure_score: input.pressureScore,
    momentum: input.momentum,
    goal_probability: input.goalProbability,
    confidence: input.confidence,
    ev: input.ev,
    fair_odd: input.fairOdd,
    market_odd: input.marketOdd,
    triggered: input.triggered,
    telegram_sent: input.telegramSent,
    metadata: input.metadata ?? {},
  };
}

async function insertRow(row: SignalDispatchRow): Promise<void> {
  const client = getSupabaseAdmin();
  if (!client) throw new Error("Supabase unavailable");

  const { error } = await client.from("signal_dispatches").insert(row);
  if (error) throw new Error(error.message);
}

export async function persistSignalDispatch(
  input: PersistSignalDispatchInput
): Promise<boolean> {
  const cloudEnabled = isSupabaseConfigured();
  const row = mapToRow(input);

  if (!cloudEnabled) return true;

  try {
    await insertRow(row);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(LOG_SCOPE, "signal_dispatches insert failed", {
      fixtureId: input.fixtureId,
      market: input.market,
      message,
    });
    await recordRuntimeOpsLog({
      event: "signal_dispatch_fail",
      message: `signal_dispatches failed: ${message}`,
      level: "warn",
      metadata: { fixtureId: input.fixtureId, market: input.market },
    });
    return false;
  }
}

export async function persistSignalDispatchBatch(
  inputs: PersistSignalDispatchInput[]
): Promise<PersistSignalDispatchResult> {
  let persisted = 0;
  let failed = 0;
  const cloudEnabled = isSupabaseConfigured();

  for (const input of inputs) {
    const ok = await persistSignalDispatch(input);
    if (ok) persisted += 1;
    else failed += 1;
  }

  logInfo(LOG_SCOPE, "Signal dispatch batch", {
    processed: inputs.length,
    persisted,
    failed,
    cloudEnabled,
  });

  if (persisted > 0 && cloudEnabled) {
    await recordRuntimeOpsLog({
      event: "signal_dispatches_saved",
      message: `signal_dispatches: ${persisted}/${inputs.length}`,
      metadata: { persisted, failed },
    });
  }

  return { persisted, failed, cloudEnabled };
}
