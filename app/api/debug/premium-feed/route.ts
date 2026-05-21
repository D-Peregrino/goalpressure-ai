import { NextResponse } from "next/server";
import {
  fetchInplayFixtures,
  getSportmonksIncludeProfile,
  isSportmonksPremiumMode,
  resetSportmonksIncludeProfile,
} from "@/lib/services/sportmonks";
import { mapSportmonksFixturesToMatches } from "@/lib/mappers/sportmonks";
import { detectPremiumFeed } from "@/lib/mappers/sportmonksPremium";
import { getLivePollingEngine } from "@/lib/live/livePollingEngine";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import { isSportmonksServiceError } from "@/lib/utils/sportmonksErrors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface PremiumFeedDebugResponse {
  ok: boolean;
  timestamp: string;
  activeIncludes: string[];
  xgAvailable: boolean;
  oddsAvailable: boolean;
  eventsAvailable: boolean;
  lineupsAvailable: boolean;
  statisticsAvailable: boolean;
  bookmakersCount: number;
  timelineEventsCount: number;
  premiumFieldsDetected: Record<string, boolean>;
  fixturesInplay: number;
  matchesMapped: number;
  enginesFed: string[];
  sample: {
    fixtureId: string;
    xG: number;
    oddsPrimary: number;
    timelineEventsCount: number;
    bookmakersCount: number;
    momentumScore: number;
    dominanceLabel: string;
    dangerousSequence: boolean;
  }[];
  lastCycle: Record<string, unknown> | null;
  errorMessage: string | null;
}

export async function GET(): Promise<NextResponse<PremiumFeedDebugResponse>> {
  bootstrapGoalPressureRuntime();

  if (process.env.SPORTMONKS_FORCE_INCLUDE_REDISCOVER === "true") {
    try {
      resetSportmonksIncludeProfile();
    } catch {
      /* optional */
    }
  }

  let errorMessage: string | null = null;
  let fixtures: Awaited<ReturnType<typeof fetchInplayFixtures>>["fixtures"] = [];

  try {
    const result = await fetchInplayFixtures();
    fixtures = result.fixtures;
  } catch (error) {
    errorMessage = isSportmonksServiceError(error)
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : "fetch_failed";
  }

  const profile = getSportmonksIncludeProfile();
  const detections = fixtures.map((f) => detectPremiumFeed(f));
  const agg = (key: keyof ReturnType<typeof detectPremiumFeed>) =>
    detections.some((d) => d[key]);

  const premiumFieldsDetected: Record<string, boolean> = {
    statistics: agg("statistics"),
    events: agg("events"),
    lineups: agg("lineups"),
    formations: agg("formations"),
    trends: agg("trends"),
    timeline: agg("timeline"),
    xg: agg("xg"),
    inplayOdds: agg("inplayOdds"),
    premiumOdds: agg("premiumOdds"),
    venue: agg("venue"),
    hasTeamLevelStats: agg("hasTeamLevelStats"),
  };

  const mapped = mapSportmonksFixturesToMatches(fixtures);

  const bookmakersCount = mapped.reduce(
    (s, m) => s + (m.premium?.bookmakersCount ?? 0),
    0
  );
  const timelineEventsCount = mapped.reduce(
    (s, m) => s + (m.premium?.timelineEventsCount ?? 0),
    0
  );

  const enginesFed: string[] = [];
  if (premiumFieldsDetected.statistics) {
    enginesFed.push(
      "live-runtime",
      "temporal",
      "microevent",
      "sequence-memory",
      "player-impact"
    );
  }
  if (premiumFieldsDetected.inplayOdds || premiumFieldsDetected.premiumOdds) {
    enginesFed.push("market-calibration");
  }
  if (premiumFieldsDetected.events || premiumFieldsDetected.timeline) {
    enginesFed.push("microevent", "temporal");
  }
  if (premiumFieldsDetected.lineups) {
    enginesFed.push("player-impact");
  }
  if (premiumFieldsDetected.trends) {
    enginesFed.push("temporal", "microevent");
  }

  const engine = getLivePollingEngine();
  const lastCycle = engine?.getState()?.lastCycle ?? null;

  const body: PremiumFeedDebugResponse = {
    ok: errorMessage == null,
    timestamp: new Date().toISOString(),
    activeIncludes: profile?.activeIncludes ?? [],
    xgAvailable:
      premiumFieldsDetected.xg || mapped.some((m) => (m.stats.xG ?? 0) > 0),
    oddsAvailable:
      premiumFieldsDetected.inplayOdds ||
      premiumFieldsDetected.premiumOdds ||
      mapped.some((m) => m.odds.primary >= 1.01),
    eventsAvailable: premiumFieldsDetected.events,
    lineupsAvailable: premiumFieldsDetected.lineups,
    statisticsAvailable: premiumFieldsDetected.statistics,
    bookmakersCount,
    timelineEventsCount,
    premiumFieldsDetected,
    fixturesInplay: fixtures.length,
    matchesMapped: mapped.length,
    enginesFed: [...new Set(enginesFed)],
    sample: mapped.slice(0, 8).map((m) => ({
      fixtureId: m.externalId ?? m.id,
      xG: m.stats.xG ?? 0,
      oddsPrimary: m.odds.primary,
      timelineEventsCount: m.premium?.timelineEventsCount ?? 0,
      bookmakersCount: m.premium?.bookmakersCount ?? 0,
      momentumScore: m.premium?.momentumScore ?? 0,
      dominanceLabel: m.premium?.dominanceLabel ?? "BALANCED",
      dangerousSequence: m.premium?.dangerousSequence ?? false,
    })),
    lastCycle: lastCycle as Record<string, unknown> | null,
    errorMessage,
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
