import type {
  LeagueBehaviorProfile,
  PressureWeightRecommendation,
  TeamBehaviorProfile,
} from "@/lib/engine/learning/learning.types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "learning-persistence";

export async function persistLeagueProfiles(
  profiles: LeagueBehaviorProfile[]
): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured() || profiles.length === 0) return 0;

  let n = 0;
  for (const p of profiles.slice(0, 20)) {
    const { error } = await admin.from("league_behavior_profiles").upsert(
      {
        league: p.league,
        chaos_score: p.chaosScore,
        conversion_score: p.conversionScore,
        volatility_score: p.volatilityScore,
        pressure_reliability: p.pressureReliability,
        late_goal_rate: p.lateGoalRate,
        sample_size: p.sampleSize,
        label: p.label,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "league" }
    );
    if (!error) n += 1;
    else logWarn(LOG_SCOPE, "league profile upsert failed", { message: error.message });
  }
  return n;
}

export async function persistTeamProfiles(
  profiles: TeamBehaviorProfile[]
): Promise<number> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured() || profiles.length === 0) return 0;

  let n = 0;
  for (const p of profiles.slice(0, 30)) {
    const { error } = await admin.from("team_behavior_profiles").upsert(
      {
        team: p.team,
        league: p.league,
        profile_type: p.profile,
        label: p.label,
        score: p.score,
        sample_size: p.sampleSize,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "team,league" }
    );
    if (!error) n += 1;
    else logWarn(LOG_SCOPE, "team profile upsert failed", { message: error.message });
  }
  return n;
}

export async function persistWeightRecommendation(
  rec: PressureWeightRecommendation
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return false;

  const { error } = await admin.from("engine_weight_recommendations").insert({
    current_weights: rec.currentWeights,
    suggested_weights: rec.suggestedWeights,
    rationale: rec.rationale,
    accuracy_before: rec.accuracyBefore,
    false_positive_rate: rec.falsePositiveRate,
    confidence: rec.confidence,
    status: "SUGGESTED",
  });

  if (error) {
    logWarn(LOG_SCOPE, "weight recommendation insert failed", {
      message: error.message,
    });
    return false;
  }
  return true;
}
