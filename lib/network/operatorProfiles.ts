import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { getNetworkConfig } from "@/lib/network/networkConfig";
import { getNetworkDevState } from "@/lib/network/networkDevStore";
import { computeOperatorReputation, rankOperators } from "@/lib/network/reputationEngine";
import type { OperatorProfile, SharedSignal } from "@/lib/network/network.types";

function rowOperator(userId: string, r: Record<string, unknown>): OperatorProfile {
  return {
    userId,
    displayName: String(r.display_name ?? "Operador"),
    reputationScore: Number(r.reputation_score ?? 50),
    precisionScore: Number(r.precision_score ?? 50),
    anticipationScore: Number(r.anticipation_score ?? 50),
    participationScore: Number(r.participation_score ?? 50),
    falsePositiveRate: Number(r.false_positive_rate ?? 20),
    reliabilityScore: Number(r.reliability_score ?? 50),
    signalsCount: Number(r.signals_count ?? 0),
    votesReceived: Number(r.votes_received ?? 0),
  };
}

export async function listOperatorProfiles(
  signals: SharedSignal[]
): Promise<OperatorProfile[]> {
  if (getNetworkConfig().sandbox) {
    return rankOperators([...getNetworkDevState().operators.values()]);
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return rankOperators([...getNetworkDevState().operators.values()]);
  }

  const { data } = await admin.from("operator_profiles").select("*").limit(50);
  if (!data?.length) {
    return rebuildOperatorsFromSignals(signals);
  }

  return rankOperators(
    data.map((r) => rowOperator(String(r.user_id), r as Record<string, unknown>))
  );
}

export async function rebuildOperatorsFromSignals(
  signals: SharedSignal[]
): Promise<OperatorProfile[]> {
  const byUser = new Map<string, { name: string; signals: SharedSignal[] }>();
  for (const s of signals) {
    const cur = byUser.get(s.userId) ?? { name: s.operatorName, signals: [] };
    cur.signals.push(s);
    byUser.set(s.userId, cur);
  }

  const profiles = [...byUser.entries()].map(([userId, { name, signals: userSigs }]) =>
    computeOperatorReputation({
      userId,
      displayName: name,
      signals,
      votesCast: 0,
    })
  );

  const ranked = rankOperators(profiles);
  await persistOperatorProfiles(ranked);
  return ranked;
}

export async function persistOperatorProfiles(profiles: OperatorProfile[]): Promise<void> {
  if (getNetworkConfig().sandbox) {
    const state = getNetworkDevState();
    state.operators.clear();
    for (const p of profiles) state.operators.set(p.userId, p);
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return;

  const rows = profiles.map((p) => ({
    user_id: p.userId,
    display_name: p.displayName,
    reputation_score: p.reputationScore,
    precision_score: p.precisionScore,
    anticipation_score: p.anticipationScore,
    participation_score: p.participationScore,
    false_positive_rate: p.falsePositiveRate,
    reliability_score: p.reliabilityScore,
    signals_count: p.signalsCount,
    votes_received: p.votesReceived,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length) {
    await admin.from("operator_profiles").upsert(rows, { onConflict: "user_id" });
    await admin.from("operator_scores").upsert(
      rows.map((r, i) => ({
        user_id: r.user_id,
        period: "rolling",
        precision_score: r.precision_score,
        anticipation_score: r.anticipation_score,
        reliability_score: r.reliability_score,
        rank_position: i + 1,
        computed_at: new Date().toISOString(),
      })),
      { onConflict: "user_id,period" }
    );
  }
}

export async function ensureOperatorProfile(
  userId: string,
  displayName: string
): Promise<void> {
  if (getNetworkConfig().sandbox) {
    if (!getNetworkDevState().operators.has(userId)) {
      getNetworkDevState().operators.set(
        userId,
        computeOperatorReputation({
          userId,
          displayName,
          signals: [],
          votesCast: 0,
        })
      );
    }
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("operator_profiles").upsert(
    {
      user_id: userId,
      display_name: displayName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}
