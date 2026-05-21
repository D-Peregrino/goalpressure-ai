/**
 * Auditoria de auto dispatch — telegram_dispatches.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "telegram-auto-dispatch-persistence";

export interface TelegramDispatchAuditRow {
  fixture_id: string;
  match_id: string;
  market: string;
  status: string;
  block_reason?: string;
  signal_id?: string;
  metadata?: Record<string, unknown>;
}

export async function persistTelegramDispatchAudit(
  row: TelegramDispatchAuditRow
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const client = getSupabaseAdmin();
  if (!client) return;

  try {
    const { error } = await client.from("telegram_dispatches").insert({
      fixture_id: row.fixture_id,
      match_id: row.match_id,
      market: row.market,
      status: row.status,
      block_reason: row.block_reason ?? null,
      signal_id: row.signal_id ?? null,
      metadata: row.metadata ?? {},
      created_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  } catch (error) {
    logWarn(LOG_SCOPE, "telegram_dispatches insert failed", {
      fixtureId: row.fixture_id,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
