import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export interface GlobalFeedMatch {
  fixtureId: string;
  label: string;
  minute: number;
  pressureScore: number;
  league: string | null;
  updatedAt: string;
}

export interface GlobalFeedSignal {
  id: string;
  fixtureId: string;
  label: string;
  market: string;
  confidence: string;
  pressure: number;
  createdAt: string;
}

export interface GlobalFeedDispatch {
  id: string;
  fixtureId: string;
  market: string;
  pressureScore: number;
  ev: number;
  triggered: boolean;
  createdAt: string;
}

export interface GlobalFeedMetric {
  id: string;
  fixtureId: string;
  homePressure: number;
  awayPressure: number;
  momentum: number;
  createdAt: string;
}

export interface GlobalFeedEdge {
  id: string;
  fixtureId: string;
  market: string;
  edgePercent: number;
  classification: string;
  createdAt: string;
}

export interface GlobalFeedPayload {
  matches: GlobalFeedMatch[];
  signals: GlobalFeedSignal[];
  dispatches: GlobalFeedDispatch[];
  metrics: GlobalFeedMetric[];
  edges: GlobalFeedEdge[];
  source: "supabase" | "empty";
}

const EMPTY: GlobalFeedPayload = {
  matches: [],
  signals: [],
  dispatches: [],
  metrics: [],
  edges: [],
  source: "empty",
};

export async function fetchGlobalFeed(limit = 8): Promise<GlobalFeedPayload> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return EMPTY;

  const [matchesRes, signalsRes, dispatchesRes, metricsRes, edgesRes] = await Promise.all([
    admin
      .from("matches")
      .select("external_id, home_team, away_team, league, minute, pressure_score, updated_at")
      .order("updated_at", { ascending: false })
      .limit(limit),
    admin
      .from("signals")
      .select("id, external_id, match_id, home_team, away_team, market, confidence, pressure, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("signal_dispatches")
      .select("id, fixture_id, market, pressure_score, ev, triggered, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("live_metrics")
      .select("id, fixture_id, home_pressure, away_pressure, momentum, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
    admin
      .from("market_edges")
      .select("id, fixture_id, market, edge_percent, classification, created_at")
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  return {
    source: "supabase",
    matches: (matchesRes.data ?? []).map((r) => ({
      fixtureId: String(r.external_id),
      label: `${r.home_team} x ${r.away_team}`,
      minute: Number(r.minute ?? 0),
      pressureScore: Number(r.pressure_score ?? 0),
      league: r.league ?? null,
      updatedAt: r.updated_at,
    })),
    signals: (signalsRes.data ?? []).map((r) => ({
      id: String(r.id),
      fixtureId: String(r.external_id ?? r.match_id ?? ""),
      label:
        r.home_team && r.away_team
          ? `${r.home_team} x ${r.away_team}`
          : `Fixture ${r.match_id ?? ""}`,
      market: r.market,
      confidence: r.confidence,
      pressure: Number(r.pressure ?? 0),
      createdAt: r.created_at,
    })),
    dispatches: (dispatchesRes.data ?? []).map((r) => ({
      id: String(r.id),
      fixtureId: r.fixture_id,
      market: r.market,
      pressureScore: Number(r.pressure_score ?? 0),
      ev: Number(r.ev ?? 0),
      triggered: Boolean(r.triggered),
      createdAt: r.created_at,
    })),
    metrics: (metricsRes.data ?? []).map((r) => ({
      id: String(r.id),
      fixtureId: r.fixture_id,
      homePressure: Number(r.home_pressure ?? 0),
      awayPressure: Number(r.away_pressure ?? 0),
      momentum: Number(r.momentum ?? 0),
      createdAt: r.created_at,
    })),
    edges: (edgesRes.data ?? []).map((r) => ({
      id: String(r.id),
      fixtureId: r.fixture_id,
      market: r.market,
      edgePercent: Number(r.edge_percent ?? 0),
      classification: r.classification,
      createdAt: r.created_at,
    })),
  };
}
