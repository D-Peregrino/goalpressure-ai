import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { recordPersistenceFailure, recordPersistenceSuccess } from "@/lib/persistence/persistenceRuntimeState";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "persistence-batch";

export function chunkRows<T>(rows: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += size) {
    chunks.push(rows.slice(i, i + size));
  }
  return chunks;
}

/**
 * Upsert em lotes com deduplicação por constraint única.
 */
export async function batchUpsertIgnoreDuplicates(
  table: string,
  rows: Record<string, unknown>[],
  onConflict: string,
  batchSize: number
): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured() || rows.length === 0) return 0;

  let written = 0;
  for (const chunk of chunkRows(rows, batchSize)) {
    const { error } = await admin.from(table).upsert(chunk, {
      onConflict,
      ignoreDuplicates: true,
    });

    if (error) {
      recordPersistenceFailure({
        table,
        message: error.message,
        scope: LOG_SCOPE,
      });
      logWarn(LOG_SCOPE, `${table} batch upsert failed`, {
        message: error.message,
        rows: chunk.length,
      });
      continue;
    }
    written += chunk.length;
    recordPersistenceSuccess(table, chunk.length);
  }

  return written;
}
