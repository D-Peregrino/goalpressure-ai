import type {
  DispatchIntensityDecision,
  MatchAutonomousProfile,
} from "@/lib/autonomous/autonomous.types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "autonomous-persistence";

export async function persistAutonomousDecision(
  fixtureId: string,
  profile: MatchAutonomousProfile,
  dispatchDecision: DispatchIntensityDecision
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return false;

  const { error } = await admin.from("autonomous_decisions").insert({
    fixture_id: fixtureId,
    regime: profile.marketRegime,
    sensitivity: profile.sensitivity,
    thresholds: profile.adaptiveThresholds,
    aggression: profile.aggressionMode,
    false_positive_risk: profile.falsePositiveRisk,
    dispatch_decision: dispatchDecision,
    autonomous_confidence: profile.autonomousConfidence,
  });

  if (error) {
    logWarn(LOG_SCOPE, "autonomous_decisions insert failed", {
      message: error.message,
    });
    return false;
  }
  return true;
}
