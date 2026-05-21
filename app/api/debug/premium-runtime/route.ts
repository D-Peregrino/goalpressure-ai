import { NextResponse } from "next/server";
import {
  fetchInplayFixtures,
  getSportmonksIncludeProfile,
  isSportmonksPremiumMode,
  resetSportmonksIncludeProfile,
} from "@/lib/services/sportmonks";
import { mapSportmonksFixturesToMatches } from "@/lib/mappers/sportmonks";
import {
  auditPremiumFixture,
  detectPremiumFeed,
} from "@/lib/mappers/sportmonksPremium";
import { getLivePollingEngine } from "@/lib/live/livePollingEngine";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import { isSportmonksServiceError } from "@/lib/utils/sportmonksErrors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface PremiumRuntimeDebugResponse {
  ok: boolean;
  timestamp: string;
  premiumModeEnabled: boolean;
  activeIncludes: string[];
  removedIncludes: string[];
  premiumFieldsDetected: Record<string, boolean>;
  xgDetected: boolean;
  oddsDetected: boolean;
  timelineDetected: boolean;
  lineupsDetected: boolean;
  bookmakersDetected: boolean;
  statisticsDetected: boolean;
  enginesReceivingPremiumData: string[];
  matchesUsingPremiumFeed: number;
  sampleFixtureIds: (number | string)[];
  lastRuntimeCycle: Record<string, unknown> | null;
  matchSamples: {
    fixtureId: string;
    xG: number;
    shots: number;
    shotsOnTarget: number;
    dangerousAttacks: number;
    corners: number;
    possession: number;
    oddsPrimary: number;
    premiumStatsActive: boolean;
  }[];
  errorMessage: string | null;
}

function aggregatePremiumFields(
  detections: ReturnType<typeof detectPremiumFeed>[]
): Record<string, boolean> {
  const keys = [
    "statistics",
    "events",
    "lineups",
    "formations",
    "trends",
    "timeline",
    "xg",
    "inplayOdds",
    "premiumOdds",
    "venue",
    "hasTeamLevelStats",
  ] as const;

  const out: Record<string, boolean> = {};
  for (const key of keys) {
    out[key] = detections.some((d) => d[key]);
  }
  return out;
}

export async function GET(): Promise<NextResponse<PremiumRuntimeDebugResponse>> {
  const timestamp = new Date().toISOString();
  bootstrapGoalPressureRuntime();

  if (process.env.SPORTMONKS_FORCE_INCLUDE_REDISCOVER === "true") {
    resetSportmonksIncludeProfile();
  }

  const cachedProfile = getSportmonksIncludeProfile();
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

  const profile = getSportmonksIncludeProfile() ?? cachedProfile;
  const activeIncludes = profile?.activeIncludes ?? [];
  const removedIncludes = profile?.removedIncludes ?? [];

  const detections = fixtures.map((f) => detectPremiumFeed(f));
  const premiumFieldsDetected = aggregatePremiumFields(detections);

  const mapped = mapSportmonksFixturesToMatches(fixtures);
  const matchesUsingPremiumFeed = mapped.filter(
    (m) => m.feedMeta?.premiumStatsActive || m.feedMeta?.hasInplayOdds || m.feedMeta?.hasXg
  ).length;

  const enginesReceivingPremiumData: string[] = [];
  if (premiumFieldsDetected.statistics) {
    enginesReceivingPremiumData.push(
      "live-runtime",
      "temporal_metrics",
      "microevent_metrics",
      "sequence_memory_metrics",
      "player_runtime_metrics"
    );
  }
  if (premiumFieldsDetected.inplayOdds || premiumFieldsDetected.premiumOdds) {
    enginesReceivingPremiumData.push("market_edges", "market_calibration");
  }
  if (premiumFieldsDetected.events) {
    enginesReceivingPremiumData.push("microevent_metrics", "temporal_metrics");
  }
  if (premiumFieldsDetected.lineups) {
    enginesReceivingPremiumData.push("player_runtime_metrics");
  }

  const engine = getLivePollingEngine();
  const lastCycle = engine?.getState()?.lastCycle ?? null;

  const body: PremiumRuntimeDebugResponse = {
    ok: errorMessage == null,
    timestamp,
    premiumModeEnabled: isSportmonksPremiumMode(),
    activeIncludes,
    removedIncludes,
    premiumFieldsDetected,
    xgDetected: premiumFieldsDetected.xg || mapped.some((m) => (m.stats.xG ?? 0) > 0),
    oddsDetected:
      premiumFieldsDetected.inplayOdds ||
      premiumFieldsDetected.premiumOdds ||
      mapped.some((m) => m.odds.primary >= 1.01),
    timelineDetected: premiumFieldsDetected.timeline,
    lineupsDetected: premiumFieldsDetected.lineups,
    bookmakersDetected: premiumFieldsDetected.premiumOdds,
    statisticsDetected: premiumFieldsDetected.statistics,
    enginesReceivingPremiumData: [...new Set(enginesReceivingPremiumData)],
    matchesUsingPremiumFeed,
    sampleFixtureIds: fixtures.slice(0, 8).map((f) => f.id),
    lastRuntimeCycle: lastCycle as Record<string, unknown> | null,
    matchSamples: mapped.slice(0, 6).map((m) => ({
      fixtureId: m.externalId ?? m.id,
      xG: m.stats.xG ?? 0,
      shots: m.stats.shots,
      shotsOnTarget: m.stats.shotsOnTarget,
      dangerousAttacks: m.stats.dangerousAttacks,
      corners: m.stats.corners,
      possession: m.stats.possession ?? 50,
      oddsPrimary: m.odds.primary,
      premiumStatsActive: m.feedMeta?.premiumStatsActive ?? false,
    })),
    errorMessage,
  };

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
