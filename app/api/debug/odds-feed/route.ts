import { NextResponse } from "next/server";
import {
  fetchInplayFixtures,
  getSportmonksIncludeProfile,
  resetSportmonksIncludeProfile,
} from "@/lib/services/sportmonks";
import { mapSportmonksFixturesToMatches } from "@/lib/mappers/sportmonks";
import { getLivePollingEngine } from "@/lib/live/livePollingEngine";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import { isSportmonksServiceError } from "@/lib/utils/sportmonksErrors";
import {
  BET365_BOOKMAKER_ID,
  buildOddsFiltersParam,
  isOddsPremiumFeedEnabled,
  ODDS_MARKETS_FILTER,
} from "@/lib/odds/sportmonksOddsConfig";
import { getMarketCalibrationOpsSnapshot } from "@/lib/market/marketSnapshot";
import { getCalibrationQuotes } from "@/lib/mappers/normalizeSportmonksOdds";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface OddsFeedDebugResponse {
  ok: boolean;
  timestamp: string;
  oddsPremiumEnabled: boolean;
  filtersApplied: string | null;
  bookmakersDetected: string[];
  marketsDetected: string[];
  oddsCount: number;
  edgeCount: number;
  steamMoves: number;
  strongestEdge: {
    fixtureId: string;
    market: string;
    edgePercent: number;
    marketOdd: number;
    fairOdd: number;
    classification: string;
  } | null;
  sampleQuotes: {
    fixtureId: string;
    marketCode: string;
    marketName: string;
    odd: number;
    impliedProbability: number;
    label: string;
  }[];
  lastCycleMarketEdgesCalibrated: number | null;
  errorMessage: string | null;
}

export async function GET(): Promise<NextResponse<OddsFeedDebugResponse>> {
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

  const mapped = mapSportmonksFixturesToMatches(fixtures);
  const bookmakerSet = new Set<string>();
  const marketSet = new Set<string>();
  let oddsCount = 0;
  const sampleQuotes: OddsFeedDebugResponse["sampleQuotes"] = [];

  for (const m of mapped) {
    const quotes = m.oddsQuotes ?? getCalibrationQuotes(m);
    oddsCount += quotes.length;
    for (const q of quotes) {
      bookmakerSet.add(q.bookmakerName || `id:${q.bookmakerId}`);
      marketSet.add(String(q.marketCode));
      if (sampleQuotes.length < 24) {
        sampleQuotes.push({
          fixtureId: m.externalId ?? m.id,
          marketCode: String(q.marketCode),
          marketName: q.marketName,
          odd: q.odd,
          impliedProbability: q.impliedProbability,
          label: q.label,
        });
      }
    }
  }

  const engine = getLivePollingEngine();
  const lastCycle = engine?.getState()?.lastCycle;
  const marketSnap = getMarketCalibrationOpsSnapshot();

  const edgeCount =
    marketSnap?.edges?.length ??
    marketSnap?.calibrated ??
    (typeof lastCycle?.marketEdgesCalibrated === "number"
      ? lastCycle.marketEdgesCalibrated
      : 0);

  const strongest = marketSnap?.strongestEdge;
  const steamMoves = marketSnap?.steamMoves ?? 0;

  const body: OddsFeedDebugResponse = {
    ok: errorMessage == null,
    timestamp: new Date().toISOString(),
    oddsPremiumEnabled: isOddsPremiumFeedEnabled(),
    filtersApplied: isOddsPremiumFeedEnabled() ? buildOddsFiltersParam() : null,
    bookmakersDetected: [...bookmakerSet],
    marketsDetected: [...marketSet],
    oddsCount,
    edgeCount,
    steamMoves,
    strongestEdge: strongest
      ? {
          fixtureId: strongest.fixtureId,
          market: strongest.market,
          edgePercent: strongest.edgePercent,
          marketOdd: strongest.marketOdd,
          fairOdd: strongest.fairOdd,
          classification: strongest.classification,
        }
      : null,
    sampleQuotes,
    lastCycleMarketEdgesCalibrated:
      typeof lastCycle?.marketEdgesCalibrated === "number"
        ? lastCycle.marketEdgesCalibrated
        : null,
    errorMessage,
  };

  if (bookmakerSet.size === 0 && oddsCount > 0) {
    bookmakerSet.add(`bet365 (${BET365_BOOKMAKER_ID})`);
  }
  if (marketSet.size === 0 && oddsCount === 0) {
    body.marketsDetected = ODDS_MARKETS_FILTER.split(",");
  }

  void getSportmonksIncludeProfile();

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
