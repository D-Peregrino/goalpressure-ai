import type { OffensivePressureResult } from "@/lib/engine/pressure/pressure.types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "live-pressure-snapshots";

export interface LivePressureSnapshotRow {
  fixture_id: string;
  minute: number;
  pressure_score: number;
  momentum_score: number;
  territorial_score: number;
  acceleration_score: number;
  signal_type: string | null;
  signal_strength: number | null;
  stats_json: Record<string, unknown>;
}

function mapResultToRow(result: OffensivePressureResult): LivePressureSnapshotRow {
  const top = result.signals[0];
  return {
    fixture_id: result.fixtureId,
    minute: result.minute,
    pressure_score: result.pressureScore,
    momentum_score: result.momentumScore,
    territorial_score: result.territorialScore,
    acceleration_score: result.accelerationScore,
    signal_type: top?.type ?? null,
    signal_strength: top?.strength ?? null,
    stats_json: result.statsJson,
  };
}

export async function persistPressureSnapshots(
  results: OffensivePressureResult[]
): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured() || results.length === 0) return 0;

  const rows = results.map(mapResultToRow);
  const { error } = await admin.from("live_pressure_snapshots").insert(rows);

  if (error) {
    logWarn(LOG_SCOPE, "Snapshot insert failed", { message: error.message });
    return 0;
  }

  return rows.length;
}
