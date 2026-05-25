import type { Match } from "@/types/domain";
import type { RankedEvSignal } from "@/lib/engine/ev/ev.types";
import type { SignalOutcomeRecord } from "@/lib/storage/signalOutcomeStorage";
import type { HistoricalSignalOutcome } from "@/lib/engine/learning/learning.types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "record-signal-outcome";

export interface RecordSignalOutcomeInput {
  fixtureId: string;
  signalType: string;
  market: HistoricalSignalOutcome["market"];
  minute: number;
  pressureScore: number;
  evPercent: number | null;
  confidence: number;
  confidenceClass: string | null;
  odd: number;
  outcome: "HIT" | "MISS";
  finalScore: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  temperature?: string | null;
}

export function recordFromResolvedSignal(
  record: SignalOutcomeRecord,
  match?: Match,
  evSignal?: RankedEvSignal | null
): RecordSignalOutcomeInput {
  const evPercent =
    evSignal?.evPercent ?? match?.evEngine?.expectedValue.best?.evPercent ?? null;
  const temp = match?.opsIntelligence?.temperature ?? null;

  return {
    fixtureId: record.externalId,
    signalType: evSignal?.signalType ?? record.market,
    market: record.market,
    minute: record.triggerMinute,
    pressureScore: record.triggerPressure,
    evPercent,
    confidence:
      match?.evEngine?.confidence.score ??
      (record.confidence === "HIGH" ? 75 : record.confidence === "MEDIUM" ? 50 : 25),
    confidenceClass:
      match?.evEngine?.confidence.class ?? record.confidence,
    odd: record.triggerOdds,
    outcome: record.outcome!,
    finalScore: record.finalScore
      ? `${record.finalScore.home}-${record.finalScore.away}`
      : "0-0",
    league: record.league,
    homeTeam: record.homeTeam,
    awayTeam: record.awayTeam,
    temperature: temp,
  };
}

/**
 * Persiste outcome histórico após final do jogo (Supabase).
 */
export async function recordSignalOutcome(
  input: RecordSignalOutcomeInput
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return false;

  const { error } = await admin.from("historical_signal_outcomes").insert({
    fixture_id: input.fixtureId,
    signal_type: input.signalType,
    market: input.market,
    minute: input.minute,
    pressure_score: input.pressureScore,
    ev: input.evPercent,
    confidence: input.confidence,
    confidence_class: input.confidenceClass,
    odd: input.odd,
    outcome: input.outcome,
    final_score: input.finalScore,
    league: input.league,
    home_team: input.homeTeam,
    away_team: input.awayTeam,
    temperature: input.temperature,
  });

  if (error) {
    logWarn(LOG_SCOPE, "historical_signal_outcomes insert failed", {
      message: error.message,
    });
    return false;
  }
  return true;
}
