import type { OperationalInsightResult } from "@/lib/engine/ops/ops.types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "operational-insights";

export async function persistOperationalInsight(
  insight: OperationalInsightResult
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return false;

  const { error } = await admin.from("operational_insights").insert({
    fixture_id: insight.fixtureId,
    game_state: insight.gameState,
    pressure_pattern: insight.pressurePattern,
    tactical_scenario: insight.tacticalScenario,
    chaos_level: insight.chaosLevel,
    temperature: insight.temperature,
    risk_context: insight.riskContext,
    narrative: insight.narrative,
  });

  if (error) {
    logWarn(LOG_SCOPE, "operational_insights insert failed", {
      message: error.message,
    });
    return false;
  }
  return true;
}
