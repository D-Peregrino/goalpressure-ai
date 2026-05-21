import { NextResponse } from "next/server";
import { getLiveMatchesCacheEntry } from "@/lib/cache/liveMatchesCache";
import { fetchInplayFixtures } from "@/lib/services/sportmonks";
import {
  buildMatchFromSportmonksFixture,
  mapSportmonksFixturesToMatches,
  type SportmonksFixture,
} from "@/lib/mappers/sportmonks";
import { getLivePollingEngine } from "@/lib/live/livePollingEngine";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import { normalizeLiveMatch } from "@/lib/ui/normalizeLiveMatch";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface LiveTrackingDebugResponse {
  ok: boolean;
  timestamp: string;
  sportmonksRawCount: number | null;
  afterFiltersCount: number | null;
  persistedMatchesCount: number | null;
  frontendVisibleCount: number | null;
  excludedMatches: {
    fixtureId: string | number | null;
    reason: string;
    name?: string | null;
  }[];
  rawSample: Record<string, unknown> | null;
  normalizedSample: Record<string, unknown> | null;
  lastRuntimeCycle: Record<string, unknown> | null;
  errorMessage?: string | null;
}

function slimRawFixture(fixture: SportmonksFixture): Record<string, unknown> {
  const home = fixture.participants?.find((p) => p.meta?.location === "home");
  const away = fixture.participants?.find((p) => p.meta?.location === "away");
  const currentScores = (fixture.scores ?? []).filter(
    (s) => (s.description ?? "").toUpperCase() === "CURRENT"
  );

  return {
    id: fixture.id,
    name: fixture.name ?? null,
    league: fixture.league?.name ?? null,
    state_id: fixture.state_id ?? null,
    state: fixture.state ?? null,
    minute: fixture.minute ?? null,
    participants: fixture.participants?.map((p) => ({
      id: p.id,
      name: p.name,
      location: p.meta?.location ?? null,
    })),
    scoresCurrent: currentScores.map((s) => ({
      participant_id: s.participant_id,
      goals: s.score?.goals,
      description: s.description,
    })),
    result_info: fixture.result_info ?? null,
  };
}

function slimNormalizedMatch(match: ReturnType<typeof buildMatchFromSportmonksFixture>) {
  const core = normalizeLiveMatch(match);
  return {
    fixtureId: core.fixtureId,
    matchId: match.id,
    homeTeam: core.homeTeam,
    awayTeam: core.awayTeam,
    homeScore: core.homeScore,
    awayScore: core.awayScore,
    scoreKnown: core.scoreKnown,
    minute: core.minute,
    minuteLabel: core.minuteLabel,
    status: core.status,
    displayStatus: core.displayStatus,
    league: core.league,
    pressureScore: match.pressure.score,
    score: match.score ?? null,
  };
}

function computeExcluded(fixtures: SportmonksFixture[]): LiveTrackingDebugResponse["excludedMatches"] {
  const excluded: LiveTrackingDebugResponse["excludedMatches"] = [];

  for (const fixture of fixtures) {
    if (typeof fixture?.id !== "number") {
      excluded.push({
        fixtureId: fixture?.id ?? null,
        reason: "invalid_fixture_id",
        name: fixture?.name ?? null,
      });
    }
  }

  return excluded;
}

async function countPersistedMatches(): Promise<number | null> {
  if (!isSupabaseConfigured()) return null;

  try {
    const client = getSupabaseAdmin();
    if (!client) return null;

    const { count, error } = await client
      .from("matches")
      .select("*", { count: "exact", head: true });

    if (error) return null;
    return count ?? null;
  } catch {
    return null;
  }
}

export async function GET(): Promise<NextResponse<LiveTrackingDebugResponse>> {
  const timestamp = new Date().toISOString();
  const errors: string[] = [];

  bootstrapGoalPressureRuntime();

  let sportmonksRawCount: number | null = null;
  let afterFiltersCount: number | null = null;
  let rawFixtures: SportmonksFixture[] = [];
  let excludedMatches: LiveTrackingDebugResponse["excludedMatches"] = [];
  let rawSample: Record<string, unknown> | null = null;
  let normalizedSample: Record<string, unknown> | null = null;

  try {
    const { fixtures } = await fetchInplayFixtures();
    rawFixtures = fixtures ?? [];
    sportmonksRawCount = rawFixtures.length;
    excludedMatches = computeExcluded(rawFixtures);

    const validFixtures = rawFixtures.filter(
      (f): f is SportmonksFixture => typeof f?.id === "number"
    );
    afterFiltersCount = validFixtures.length;

    const mapped = mapSportmonksFixturesToMatches(rawFixtures);

    if (validFixtures[0]) {
      rawSample = slimRawFixture(validFixtures[0]);
    }
    if (mapped[0]) {
      normalizedSample = slimNormalizedMatch(mapped[0]);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "SportMonks fetch failed";
    errors.push(message);
  }

  const cache = getLiveMatchesCacheEntry();
  const frontendVisibleCount = cache?.matches?.length ?? null;

  if (!rawSample && cache?.matches?.[0]) {
    const m = cache.matches[0];
    normalizedSample = slimNormalizedMatch(m);
    afterFiltersCount = afterFiltersCount ?? cache.matches.length;
  }

  const engine = getLivePollingEngine();
  const lastRuntimeCycle = engine?.getState()?.lastCycle
    ? { ...engine.getState().lastCycle }
    : null;

  let persistedMatchesCount: number | null =
    typeof lastRuntimeCycle?.matchesUpserted === "number"
      ? lastRuntimeCycle.matchesUpserted
      : null;

  const supabaseCount = await countPersistedMatches();
  if (supabaseCount != null) {
    persistedMatchesCount = supabaseCount;
  }

  const body: LiveTrackingDebugResponse = {
    ok: errors.length === 0 || sportmonksRawCount != null,
    timestamp,
    sportmonksRawCount,
    afterFiltersCount,
    persistedMatchesCount,
    frontendVisibleCount,
    excludedMatches,
    rawSample,
    normalizedSample,
    lastRuntimeCycle: lastRuntimeCycle as Record<string, unknown> | null,
    errorMessage: errors.length > 0 ? errors.join("; ") : null,
  };

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}
