import type { RankedEvSignal } from "@/lib/engine/ev/ev.types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "live-ev-signals";

export async function persistEvSignals(
  fixtureId: string,
  signals: RankedEvSignal[]
): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured() || signals.length === 0) return 0;

  const rows = signals.slice(0, 5).map((s) => ({
    fixture_id: fixtureId,
    market_type: String(s.market),
    probability: s.probability,
    fair_odds: s.fairOdds,
    market_odds: s.marketOdds,
    expected_value: s.expectedValue,
    distortion_level: s.distortionLevel,
    confidence_score: s.confidenceScore,
    engine_score: s.rankScore,
    signal_type: s.signalType,
  }));

  const { error } = await admin.from("live_ev_signals").insert(rows);
  if (error) {
    logWarn(LOG_SCOPE, "EV signal insert failed", { message: error.message });
    return 0;
  }
  return rows.length;
}
