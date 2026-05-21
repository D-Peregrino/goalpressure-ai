/**
 * Persist Telegram dispatch records to Supabase dispatch_logs.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "telegram-dispatch-persistence";

export interface PersistDispatchLogInput {
  dispatchId: string;
  signalId: string;
  modelId: string;
  source: string;
  matchId: string;
  fixtureId?: string;
  market: string;
  status: string;
  latencyMs?: number;
  errorMessage?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export async function persistDispatchLog(
  input: PersistDispatchLogInput
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const client = getSupabaseAdmin();
  if (!client) return false;

  const row = {
    dispatch_id: input.dispatchId,
    signal_id: input.signalId,
    model_id: input.modelId,
    source: input.source,
    match_id: input.matchId,
    fixture_id: input.fixtureId ?? input.matchId.replace(/^sm-/, ""),
    market: input.market,
    status: input.status,
    latency_ms: input.latencyMs ?? null,
    error_message: input.errorMessage ?? null,
    message: input.message ?? null,
    metadata: input.metadata ?? {},
    dispatched_at: new Date().toISOString(),
  };

  const { error } = await client.from("dispatch_logs").upsert(row, {
    onConflict: "dispatch_id",
  });

  if (error) {
    logWarn(LOG_SCOPE, "dispatch_logs upsert failed", { message: error.message });
    return false;
  }

  return true;
}
