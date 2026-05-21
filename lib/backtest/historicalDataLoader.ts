/**
 * Carrega dataset histórico para backtest (Supabase + timelines locais).
 */

import { readFile, readdir } from "fs/promises";
import path from "path";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type {
  BacktestHistoricalInput,
  BacktestHistoricalMatch,
  BacktestLiveMetricRow,
  BacktestSignalDispatchRow,
} from "@/types/backtest";
import type { MatchScore, MatchStatus } from "@/types/domain";
import type { MatchTimelineDocument } from "@/lib/storage/matchTimelineStorage";
import { logOps } from "@/lib/utils/logger";

const LOG_SCOPE = "backtest-data-loader";
const MATCHES_DIR = path.join(process.cwd(), "data", "matches");

function parseScore(raw: unknown): MatchScore | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as { home?: unknown; away?: unknown };
  const home = Number(s.home);
  const away = Number(s.away);
  if (!Number.isFinite(home) || !Number.isFinite(away)) return null;
  return { home, away };
}

function totalGoals(score: MatchScore | null): number {
  if (!score) return 0;
  return score.home + score.away;
}

function goalsAtMinuteFromTimeline(
  timeline: MatchTimelineDocument,
  triggerMinute: number
): number | undefined {
  let best: MatchTimelineDocument["timeline"][0] | null = null;
  for (const entry of timeline.timeline) {
    if (entry.minute <= triggerMinute) {
      if (!best || entry.minute >= best.minute) best = entry;
    }
  }
  if (best?.score) return totalGoals(best.score);
  return undefined;
}

async function loadLocalTimelines(): Promise<Map<string, MatchTimelineDocument>> {
  const map = new Map<string, MatchTimelineDocument>();
  try {
    const files = await readdir(MATCHES_DIR);
    for (const name of files) {
      if (!name.startsWith("match-") || !name.endsWith(".json")) continue;
      try {
        const raw = await readFile(path.join(MATCHES_DIR, name), "utf8");
        const doc = JSON.parse(raw) as MatchTimelineDocument;
        map.set(doc.externalId, doc);
        map.set(doc.matchId, doc);
      } catch {
        // skip corrupt file
      }
    }
  } catch {
    // no local timelines
  }
  return map;
}

function mapDispatchRow(row: Record<string, unknown>): BacktestSignalDispatchRow {
  return {
    id: row.id as string | undefined,
    fixtureId: String(row.fixture_id),
    market: String(row.market),
    pressureScore: Number(row.pressure_score) || 0,
    momentum: Number(row.momentum) || 0,
    goalProbability: Number(row.goal_probability) || 0,
    confidence: Number(row.confidence) || 0,
    ev: Number(row.ev) || 0,
    fairOdd: Number(row.fair_odd) || 0,
    marketOdd: Number(row.market_odd) || 0,
    triggered: Boolean(row.triggered),
    telegramSent: Boolean(row.telegram_sent),
    createdAt: String(row.created_at ?? new Date().toISOString()),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
  };
}

function mapMatchRow(
  row: Record<string, unknown>,
  timelines: Map<string, MatchTimelineDocument>
): BacktestHistoricalMatch {
  const fixtureId = String(row.fixture_id ?? row.external_id);
  const finalScore = parseScore(row.score);
  const timeline =
    timelines.get(fixtureId) ?? timelines.get(`sm-${fixtureId}`);
  const metaMinute =
    typeof row.minute === "number" ? row.minute : undefined;

  let goalsAtTrigger: number | undefined;
  let triggerMinute: number | undefined;

  if (timeline && metaMinute != null) {
    goalsAtTrigger = goalsAtMinuteFromTimeline(timeline, metaMinute);
    triggerMinute = metaMinute;
  }

  return {
    fixtureId,
    matchId: `sm-${fixtureId}`,
    homeTeam: row.home_team as string | undefined,
    awayTeam: row.away_team as string | undefined,
    league: row.league as string | undefined,
    status: row.status as MatchStatus | undefined,
    finalScore,
    goalsAtTrigger,
    triggerMinute,
    lastSeenAt: row.last_seen_at as string | undefined,
  };
}

function mapMetricRow(row: Record<string, unknown>): BacktestLiveMetricRow {
  const meta = (row.metadata as Record<string, unknown>) ?? {};
  return {
    id: row.id as string | undefined,
    fixtureId: String(row.fixture_id),
    pressureScore:
      Number(meta.pressure_score ?? row.pressure_score) || undefined,
    momentum: Number(row.momentum) || undefined,
    goalProbability: Number(row.goal_probability) || undefined,
    confidence: Number(row.confidence) || undefined,
    createdAt: row.created_at as string | undefined,
    metadata: meta,
  };
}

export interface LoadHistoricalDatasetOptions {
  dispatchLimit?: number;
  matchLimit?: number;
  sinceIso?: string;
}

export interface LoadHistoricalDatasetResult {
  input: BacktestHistoricalInput;
  source: "supabase" | "empty";
  counts: {
    matches: number;
    dispatches: number;
    metrics: number;
  };
}

/**
 * Carrega matches, live_metrics e signal_dispatches do Supabase para backtest.
 */
export async function loadHistoricalBacktestDataset(
  options: LoadHistoricalDatasetOptions = {}
): Promise<LoadHistoricalDatasetResult> {
  const timelines = await loadLocalTimelines();
  const empty: LoadHistoricalDatasetResult = {
    input: { matches: [], signalDispatches: [], liveMetrics: [] },
    source: "empty",
    counts: { matches: 0, dispatches: 0, metrics: 0 },
  };

  if (!isSupabaseConfigured()) {
    logOps(LOG_SCOPE, "[backtest-engine] Supabase not configured — empty dataset");
    return empty;
  }

  const client = getSupabaseAdmin();
  if (!client) return empty;

  const dispatchLimit = options.dispatchLimit ?? 500;
  const matchLimit = options.matchLimit ?? 500;

  let dispatchQuery = client
    .from("signal_dispatches")
    .select("*")
    .eq("triggered", true)
    .order("created_at", { ascending: false })
    .limit(dispatchLimit);

  if (options.sinceIso) {
    dispatchQuery = dispatchQuery.gte("created_at", options.sinceIso);
  }

  const { data: dispatchRows, error: dispatchError } = await dispatchQuery;

  if (dispatchError) {
    logOps(LOG_SCOPE, "[backtest-engine] dispatch load failed", {
      message: dispatchError.message,
    });
    return empty;
  }

  const dispatches = (dispatchRows ?? []).map((r) =>
    mapDispatchRow(r as Record<string, unknown>)
  );

  const fixtureIds = [...new Set(dispatches.map((d) => d.fixtureId))];

  let matches: BacktestHistoricalMatch[] = [];

  if (fixtureIds.length > 0) {
    const { data: matchRows, error: matchError } = await client
      .from("matches")
      .select("*")
      .in("external_id", fixtureIds.slice(0, matchLimit));

    if (!matchError && matchRows) {
      matches = matchRows.map((r) =>
        mapMatchRow(r as Record<string, unknown>, timelines)
      );
    }
  }

  for (const dispatch of dispatches) {
    if (matches.some((m) => m.fixtureId === dispatch.fixtureId)) continue;

    const timeline =
      timelines.get(dispatch.fixtureId) ??
      timelines.get(`sm-${dispatch.fixtureId}`);
    const minute = (dispatch.metadata?.minute as number) ?? 0;

    matches.push({
      fixtureId: dispatch.fixtureId,
      matchId: `sm-${dispatch.fixtureId}`,
      finalScore: timeline
        ? timeline.timeline[timeline.timeline.length - 1]?.score ?? null
        : null,
      goalsAtTrigger: timeline
        ? goalsAtMinuteFromTimeline(timeline, minute)
        : resolveGoalsAtTrigger(dispatch),
      triggerMinute: minute,
      status: timeline?.finishedAt ? "FINISHED" : "UNKNOWN",
    });
  }

  const { data: metricRows } = await client
    .from("live_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(dispatchLimit);

  const liveMetrics = (metricRows ?? []).map((r) =>
    mapMetricRow(r as Record<string, unknown>)
  );

  logOps(LOG_SCOPE, "[backtest-engine] dataset loaded", {
    matches: matches.length,
    dispatches: dispatches.length,
    metrics: liveMetrics.length,
  });

  return {
    input: {
      matches,
      signalDispatches: dispatches,
      liveMetrics,
      strategy: "signal_decision_ev_plus",
    },
    source: "supabase",
    counts: {
      matches: matches.length,
      dispatches: dispatches.length,
      metrics: liveMetrics.length,
    },
  };
}

function resolveGoalsAtTrigger(dispatch: BacktestSignalDispatchRow): number {
  const meta = dispatch.metadata ?? {};
  if (typeof meta.goals_at_trigger === "number") return meta.goals_at_trigger;
  if (typeof meta.goalsAtTrigger === "number") return meta.goalsAtTrigger;
  return 0;
}
