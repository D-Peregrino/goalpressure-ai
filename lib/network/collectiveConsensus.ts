import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { getNetworkConfig } from "@/lib/network/networkConfig";
import { getNetworkDevState } from "@/lib/network/networkDevStore";
import type { CollectiveContext, SharedSignal } from "@/lib/network/network.types";
import { aggregateSharedWatchlists } from "@/lib/network/sharedWatchlists";

export function computeConsensusScore(params: {
  observerCount: number;
  signalCount: number;
  uniqueOperators: number;
  avgPressure: number;
  validateVotes: number;
}): number {
  const { minObserversForConsensus } = getNetworkConfig();
  const observerBoost = params.observerCount >= minObserversForConsensus ? 18 : 8;
  const raw =
    observerBoost +
    params.uniqueOperators * 10 +
    params.signalCount * 5 +
    params.avgPressure * 0.35 +
    params.validateVotes * 2;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

export function buildCollectiveFromSignals(
  signals: SharedSignal[],
  watchObservers: Map<string, number>
): CollectiveContext[] {
  const map = new Map<string, SharedSignal[]>();
  for (const s of signals) {
    const list = map.get(s.fixtureId) ?? [];
    list.push(s);
    map.set(s.fixtureId, list);
  }

  const out: CollectiveContext[] = [];
  for (const [fixtureId, sigs] of map) {
    const users = new Set(sigs.map((s) => s.userId));
    const avgPressure =
      sigs.reduce((a, s) => a + (s.pressureScore ?? 0), 0) / Math.max(1, sigs.length);
    const validateVotes = sigs.reduce((a, s) => a + s.validateCount, 0);
    const watchBoost = watchObservers.get(fixtureId) ?? 0;
    const observerCount = users.size + watchBoost;

    out.push({
      fixtureId,
      matchLabel: sigs[0]!.matchLabel,
      league: sigs[0]!.league,
      observerCount,
      consensusScore: computeConsensusScore({
        observerCount,
        signalCount: sigs.length,
        uniqueOperators: users.size,
        avgPressure,
        validateVotes,
      }),
      collectivePressure: Math.round(avgPressure),
      traits: {
        operators: users.size,
        signals: sigs.length,
        watchlistObservers: watchBoost,
      },
      updatedAt: new Date().toISOString(),
    });
  }

  return out.sort((a, b) => b.consensusScore - a.consensusScore);
}

export async function listCollectiveContext(): Promise<CollectiveContext[]> {
  if (getNetworkConfig().sandbox) {
    return [...getNetworkDevState().collective.values()].sort(
      (a, b) => b.consensusScore - a.consensusScore
    );
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return [...getNetworkDevState().collective.values()];
  }

  const { data } = await admin
    .from("collective_context")
    .select("*")
    .order("consensus_score", { ascending: false })
    .limit(24);

  if (!data?.length) return [];

  return data.map((r) => ({
    fixtureId: String(r.fixture_id),
    matchLabel: String(r.match_label),
    league: (r.league as string) ?? null,
    observerCount: Number(r.observer_count),
    consensusScore: Number(r.consensus_score),
    collectivePressure: Number(r.collective_pressure),
    traits: (r.traits as Record<string, unknown>) ?? {},
    updatedAt: String(r.updated_at),
  }));
}

export async function persistCollectiveContexts(contexts: CollectiveContext[]): Promise<void> {
  if (getNetworkConfig().sandbox) {
    const state = getNetworkDevState();
    state.collective.clear();
    for (const c of contexts) state.collective.set(c.fixtureId, c);
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return;

  const rows = contexts.map((c) => ({
    fixture_id: c.fixtureId,
    match_label: c.matchLabel,
    league: c.league,
    observer_count: c.observerCount,
    consensus_score: c.consensusScore,
    collective_pressure: c.collectivePressure,
    traits: c.traits,
    updated_at: c.updatedAt,
  }));

  if (rows.length) {
    await admin.from("collective_context").upsert(rows, { onConflict: "fixture_id" });
  }
}

export async function refreshCollectiveConsensus(
  signals: SharedSignal[]
): Promise<CollectiveContext[]> {
  const watchMap = await aggregateSharedWatchlists();
  const contexts = buildCollectiveFromSignals(signals, watchMap);
  await persistCollectiveContexts(contexts);
  return contexts;
}
