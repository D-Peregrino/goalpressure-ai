import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { listNetworkTimeline } from "@/lib/network/networkTimeline";
import type {
  ReplayAlertPoint,
  ReplayContextPoint,
  ReplayPredictivePoint,
  ReplaySnapshotPoint,
} from "@/lib/replay/replayEngine";

function scoreFromJson(scoreJson: unknown): { home: number; away: number } {
  if (!scoreJson || typeof scoreJson !== "object") return { home: 0, away: 0 };
  const raw = scoreJson as { home?: unknown; away?: unknown };
  return {
    home: Number(raw.home ?? 0),
    away: Number(raw.away ?? 0),
  };
}

export async function listReplayFixtures(): Promise<
  { fixtureId: string; matchLabel: string; league: string; lastMinute: number }[]
> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return [];

  const { data } = await admin
    .from("live_match_snapshots")
    .select("fixture_id, home_team, away_team, league, minute")
    .order("recorded_at", { ascending: false })
    .limit(300);

  if (!data?.length) return [];

  const byFixture = new Map<
    string,
    { fixtureId: string; matchLabel: string; league: string; lastMinute: number }
  >();

  for (const row of data) {
    const fixtureId = String(row.fixture_id);
    if (byFixture.has(fixtureId)) continue;
    byFixture.set(fixtureId, {
      fixtureId,
      matchLabel: `${String(row.home_team ?? "Casa")} × ${String(row.away_team ?? "Fora")}`,
      league: String(row.league ?? "Liga"),
      lastMinute: Number(row.minute ?? 0),
    });
  }
  return [...byFixture.values()].slice(0, 20);
}

export async function loadReplayRawData(fixtureId: string): Promise<{
  snapshots: ReplaySnapshotPoint[];
  contexts: ReplayContextPoint[];
  predictive: ReplayPredictivePoint[];
  alerts: ReplayAlertPoint[];
  network: { id: string; eventType: string; label: string; createdAt: string }[];
}> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return { snapshots: [], contexts: [], predictive: [], alerts: [], network: [] };
  }

  const [snapRes, ctxRes, predRes, alertRes, network] = await Promise.all([
    admin
      .from("live_match_snapshots")
      .select("*")
      .eq("fixture_id", fixtureId)
      .order("minute", { ascending: true }),
    admin
      .from("contextual_readings")
      .select("*")
      .eq("fixture_id", fixtureId)
      .order("minute", { ascending: true }),
    admin
      .from("predictive_history")
      .select("*")
      .eq("fixture_id", fixtureId)
      .order("minute", { ascending: true }),
    admin
      .from("autonomous_alerts")
      .select("*")
      .eq("fixture_id", fixtureId)
      .order("minute", { ascending: true }),
    listNetworkTimeline(fixtureId),
  ]);

  const snapshots: ReplaySnapshotPoint[] = (snapRes.data ?? []).map((row) => {
    const score = scoreFromJson(row.score_json);
    const meta =
      row.metadata_json && typeof row.metadata_json === "object"
        ? (row.metadata_json as Record<string, unknown>)
        : {};
    return {
      fixtureId: String(row.fixture_id),
      minute: Number(row.minute ?? 0),
      league: String(row.league ?? "Liga"),
      matchLabel: `${String(row.home_team ?? "Casa")} × ${String(row.away_team ?? "Fora")}`,
      pressureScore: Number(row.pressure_score ?? 0),
      momentumScore: Number(row.momentum_score ?? 0),
      homeTeam: String(row.home_team ?? "Casa"),
      awayTeam: String(row.away_team ?? "Fora"),
      homeScore: score.home,
      awayScore: score.away,
      recordedAt: String(row.recorded_at),
      sportmonksMeta: {
        momentumDirection:
          meta.momentumDirection != null ? String(meta.momentumDirection) : null,
        commentaryCount: Number(meta.commentaryCount ?? 0),
        timelineEventsCount: Number(meta.timelineEventsCount ?? 0),
        xgHome: meta.xgHome != null ? Number(meta.xgHome) : null,
        xgAway: meta.xgAway != null ? Number(meta.xgAway) : null,
        advancedOddsCount: Number(meta.advancedOddsCount ?? 0),
      },
    };
  });

  const contexts: ReplayContextPoint[] = (ctxRes.data ?? []).map((row) => ({
    fixtureId: String(row.fixture_id),
    minute: Number(row.minute ?? 0),
    contextScore: Number(row.context_score ?? 0),
    contextLevel: String(row.context_level ?? "NORMAL"),
    alertLevel: row.alert_level ? String(row.alert_level) : null,
    statusOperacional: row.status_operacional ? String(row.status_operacional) : null,
    narrative: row.narrative ? String(row.narrative) : null,
    recordedAt: String(row.recorded_at),
  }));

  const predictive: ReplayPredictivePoint[] = (predRes.data ?? []).map((row) => ({
    fixtureId: String(row.fixture_id),
    minute: Number(row.minute ?? 0),
    predictiveLevel: String(row.predictive_level ?? "monitor"),
    breakProbability: Number(row.break_probability ?? 0),
    marketLagScore: Number(row.market_lag_score ?? 0),
    goalPressureProbability: Number(row.goal_pressure_probability ?? 0),
    narrative: row.narrative ? String(row.narrative) : null,
    recordedAt: String(row.recorded_at),
  }));

  const alerts: ReplayAlertPoint[] = (alertRes.data ?? []).map((row) => ({
    fixtureId: String(row.fixture_id),
    minute: Number(row.minute ?? 0),
    alertKind: String(row.alert_kind ?? "alert"),
    priority: String(row.priority ?? "medium"),
    headline: row.headline ? String(row.headline) : null,
    narrative: row.narrative ? String(row.narrative) : null,
    contextScore: Number(row.context_score ?? 0),
    recordedAt: String(row.recorded_at),
  }));

  return {
    snapshots,
    contexts,
    predictive,
    alerts,
    network: network.map((n) => ({
      id: n.id,
      eventType: n.eventType,
      label: n.label,
      createdAt: n.createdAt,
    })),
  };
}
