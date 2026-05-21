import { NextResponse } from "next/server";
import {
  getCacheAgeMs,
  getCacheExpiresInMs,
  getLiveMatchesCacheEntry,
  isLiveMatchesCacheValid,
  LIVE_MATCHES_CACHE_TTL_MS,
  setLiveMatchesCacheEntry,
  type LiveMatchesCacheEntry,
  type LiveMatchesCacheStatus,
} from "@/lib/cache/liveMatchesCache";
import { mapSportmonksFixturesToMatches } from "@/lib/mappers/sportmonks";
import { processLiveEngineBatch } from "@/lib/engine/liveEnginePipeline";
import { fetchInplayFixtures } from "@/lib/services/sportmonks";
import { appendMatchTimeline } from "@/lib/storage/matchTimelineStorage";
import { saveLiveSnapshotAsync } from "@/lib/storage/snapshotStorage";
import { generateSignalAnalytics } from "@/lib/analytics/signalAnalytics";
import { runExperimentalEvaluationAsync } from "@/lib/experimental/experimentalSignalEngine";
import { trackSignalOutcomes } from "@/lib/storage/signalOutcomeStorage";
import { logError, logInfo, logWarn } from "@/lib/utils/logger";
import {
  isSportmonksServiceError,
  type SportmonksErrorCode,
} from "@/lib/utils/sportmonksErrors";
import type { Signal } from "@/types/domain";
import type {
  LiveMatchesApiResponse,
  LiveMatchesErrorResponse,
  LiveMatchesSuccessResponse,
} from "@/types/api";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/live-matches";

async function persistTimelineThenOutcomes(
  matches: LiveMatchesSuccessResponse["matches"],
  signals: Signal[],
  meta: LiveMatchesSuccessResponse["meta"]
): Promise<void> {
  await appendMatchTimeline(matches, signals, meta);
  await trackSignalOutcomes(matches, signals, meta);
  await generateSignalAnalytics();
}

function scheduleHistoricalPersistence(
  matches: LiveMatchesSuccessResponse["matches"],
  meta: LiveMatchesSuccessResponse["meta"],
  signals: Signal[]
): void {

  if (matches.length > 0 || signals.length > 0) {
    void persistTimelineThenOutcomes(matches, signals, meta).catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      logWarn(ROUTE_SCOPE, "Timeline/outcome persistence failed", { message });
    });
    runExperimentalEvaluationAsync(matches);
  }

  if (matches.length === 0 && signals.length === 0) return;
  saveLiveSnapshotAsync(matches, signals, meta);
}

function errorStatusForCode(code: SportmonksErrorCode): number {
  switch (code) {
    case "MISSING_TOKEN":
      return 503;
    case "RATE_LIMIT":
      return 429;
    case "TIMEOUT":
      return 504;
    case "EMPTY_RESPONSE":
      return 200;
    case "INVALID_PAYLOAD":
    case "HTTP_ERROR":
    case "NETWORK_ERROR":
    default:
      return 502;
  }
}

function buildErrorResponse(
  code: SportmonksErrorCode,
  message: string,
  responseTimeMs: number
): NextResponse<LiveMatchesErrorResponse> {
  const body: LiveMatchesErrorResponse = {
    ok: false,
    error: { code, message },
    matches: [],
    meta: {
      responseTimeMs,
      fetchedAt: new Date().toISOString(),
    },
  };

  logError(ROUTE_SCOPE, message, { code, responseTimeMs });

  return NextResponse.json(body, {
    status: errorStatusForCode(code),
    headers: { "Cache-Control": "no-store" },
  });
}

function buildSuccessFromCache(
  entry: LiveMatchesCacheEntry,
  cacheStatus: LiveMatchesCacheStatus,
  routeStartedAt: number,
  options?: { warning?: string }
): NextResponse<LiveMatchesSuccessResponse> {
  const now = Date.now();
  const cacheAgeMs = getCacheAgeMs(entry, now);
  const cacheExpiresInMs = getCacheExpiresInMs(entry, now);
  const totalMs = now - routeStartedAt;

  const engineResult = processLiveEngineBatch(entry.matches, {
    enqueueTelegram: true,
  });

  const body: LiveMatchesSuccessResponse = {
    ok: true,
    matches: engineResult.matches,
    signals: engineResult.signals,
    engine: engineResult.snapshot,
    meta: {
      count: entry.matches.length,
      responseTimeMs: totalMs,
      fetchedAt: new Date(entry.fetchedAt).toISOString(),
      source: "sportmonks",
      rateLimitRemaining: entry.rateLimitRemaining,
      rateLimitResetsInSeconds: entry.rateLimitResetsInSeconds,
      cache: cacheStatus,
      cacheAgeMs,
      cacheExpiresInMs,
      ...(options?.warning ? { warning: options.warning } : {}),
    },
  };

  const logLabel =
    cacheStatus === "HIT"
      ? "CACHE HIT"
      : cacheStatus === "STALE"
        ? "CACHE STALE"
        : "CACHE MISS";

  const logFn = cacheStatus === "STALE" ? logWarn : logInfo;

  logFn(ROUTE_SCOPE, logLabel, {
    matchCount: entry.matches.length,
    cacheAgeMs,
    cacheExpiresInMs,
    totalMs,
    ttlMs: LIVE_MATCHES_CACHE_TTL_MS,
    ...(options?.warning ? { warning: options.warning } : {}),
  });

  scheduleHistoricalPersistence(
    body.matches,
    body.meta,
    engineResult.signals
  );

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

function runEngineOnMatches(matches: LiveMatchesSuccessResponse["matches"]) {
  return processLiveEngineBatch(matches, { enqueueTelegram: true });
}

async function fetchAndCacheMatches(routeStartedAt: number): Promise<
  NextResponse<LiveMatchesSuccessResponse>
> {
  const { fixtures, responseTimeMs, rateLimit } = await fetchInplayFixtures();
  const matches = mapSportmonksFixturesToMatches(fixtures);
  const fetchedAt = Date.now();

  const entry = setLiveMatchesCacheEntry({
    matches,
    fetchedAt,
    rateLimitRemaining: rateLimit?.remaining,
    rateLimitResetsInSeconds: rateLimit?.resetsInSeconds,
  });

  const totalMs = Date.now() - routeStartedAt;
  const cacheExpiresInMs = getCacheExpiresInMs(entry, Date.now());

  logInfo(ROUTE_SCOPE, "CACHE MISS", {
    matchCount: matches.length,
    sportmonksMs: responseTimeMs,
    totalMs,
    cacheAgeMs: 0,
    cacheExpiresInMs,
    ttlMs: LIVE_MATCHES_CACHE_TTL_MS,
    rateLimit,
  });

  logInfo(ROUTE_SCOPE, "Request completed", {
    matchCount: matches.length,
    sportmonksMs: responseTimeMs,
    totalMs,
    rateLimit,
    apiStatus: "ok",
    cache: "MISS",
  });

  const engineResult = runEngineOnMatches(matches);

  const body: LiveMatchesSuccessResponse = {
    ok: true,
    matches: engineResult.matches,
    signals: engineResult.signals,
    engine: engineResult.snapshot,
    meta: {
      count: engineResult.matches.length,
      responseTimeMs: totalMs,
      fetchedAt: new Date(fetchedAt).toISOString(),
      source: "sportmonks",
      rateLimitRemaining: rateLimit?.remaining,
      rateLimitResetsInSeconds: rateLimit?.resetsInSeconds,
      cache: "MISS",
      cacheAgeMs: 0,
      cacheExpiresInMs,
    },
  };

  scheduleHistoricalPersistence(
    body.matches,
    body.meta,
    engineResult.signals
  );

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

/**
 * GET /api/live-matches
 *
 * Sportmonks API → service → mapper → live engine → Match[] + signals
 * In-memory cache (TTL 20s) reduces external API calls.
 */
export async function GET(): Promise<NextResponse<LiveMatchesApiResponse>> {
  const routeStartedAt = Date.now();

  logInfo(ROUTE_SCOPE, "Request started", {
    ttlMs: LIVE_MATCHES_CACHE_TTL_MS,
  });

  const cached = getLiveMatchesCacheEntry();

  if (cached && isLiveMatchesCacheValid(cached)) {
    return buildSuccessFromCache(cached, "HIT", routeStartedAt);
  }

  try {
    return await fetchAndCacheMatches(routeStartedAt);
  } catch (error) {
    const responseTimeMs = Date.now() - routeStartedAt;

    if (cached) {
      return buildSuccessFromCache(cached, "STALE", routeStartedAt, {
        warning: "Returning stale cache because Sportmonks request failed",
      });
    }

    if (isSportmonksServiceError(error)) {
      return buildErrorResponse(error.code, error.message, responseTimeMs);
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    logError(ROUTE_SCOPE, "Unhandled error", {
      message,
      responseTimeMs,
    });

    return buildErrorResponse("NETWORK_ERROR", message, responseTimeMs);
  }
}
