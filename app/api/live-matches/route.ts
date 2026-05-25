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
import type { ActiveDataSource } from "@/lib/data-source/config";
import {
  getSportmonksBaseUrl,
  isSeedAllowed,
  isSportmonksTokenConfigured,
  resolveActiveDataSource,
} from "@/lib/data-source/config";
import { recordLiveFetchTelemetry } from "@/lib/data-source/telemetry";
import { mapSportmonksFixturesToMatches } from "@/lib/mappers/sportmonks";
import { processLiveEngineBatch } from "@/lib/engine/liveEnginePipeline";
import { fetchLiveFixtures, INPLAY_PATH } from "@/lib/sportmonks/client";
import { appendMatchTimeline } from "@/lib/storage/matchTimelineStorage";
import { saveLiveSnapshotAsync } from "@/lib/storage/snapshotStorage";
import { generateSignalAnalytics } from "@/lib/analytics/signalAnalytics";
import { runExperimentalEvaluationAsync } from "@/lib/experimental/experimentalSignalEngine";
import { trackSignalOutcomes } from "@/lib/storage/signalOutcomeStorage";
import { scheduleLearningFeedbackLoop } from "@/lib/engine/learning/runLearningFeedbackLoop";
import { isLearningCacheStale } from "@/lib/engine/learning/learningSnapshotStore";
import { persistLiveMatches } from "@/lib/live/liveMatchPersistence";
import { logError, logInfo, logWarn } from "@/lib/utils/logger";
import {
  isSportmonksServiceError,
  SportmonksServiceError,
  type SportmonksErrorCode,
} from "@/lib/utils/sportmonksErrors";
import type { Signal } from "@/types/domain";
import type {
  LiveMatchesApiResponse,
  LiveMatchesErrorResponse,
  LiveMatchesSuccessResponse,
  SportmonksFetchErrorDetail,
} from "@/types/api";
import { isSeedLiveModeEnabled, loadSeedLiveMatches } from "@/lib/seed/loadLiveMatches";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/live-matches";
const SPORTMONKS_FAILURE_HEADLINE =
  "SportMonks configurado, mas falhou ao buscar dados reais.";

function metaBadgeFor(source: ActiveDataSource): string | undefined {
  if (source === "sportmonks") return "DADOS REAIS · SPORTMONKS";
  if (source === "seed") return "Seed operacional (dev)";
  return undefined;
}

async function persistTimelineThenOutcomes(
  matches: LiveMatchesSuccessResponse["matches"],
  signals: Signal[],
  meta: LiveMatchesSuccessResponse["meta"]
): Promise<void> {
  await appendMatchTimeline(matches, signals, meta);
  await trackSignalOutcomes(matches, signals, meta);
  await generateSignalAnalytics();
  if (isLearningCacheStale()) {
    scheduleLearningFeedbackLoop();
  }
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

function sportmonksEndpointLabel(): string {
  return `${getSportmonksBaseUrl()}${INPLAY_PATH}`;
}

function buildSportmonksErrorDetail(
  error: unknown
): SportmonksFetchErrorDetail {
  const endpoint = sportmonksEndpointLabel();
  if (isSportmonksServiceError(error)) {
    return {
      httpStatus: error.statusCode,
      message: `${SPORTMONKS_FAILURE_HEADLINE} ${error.message}`,
      endpoint,
    };
  }
  const message =
    error instanceof Error ? error.message : "Erro inesperado ao contactar SportMonks.";
  return {
    httpStatus: error instanceof SportmonksServiceError ? error.statusCode : undefined,
    message: `${SPORTMONKS_FAILURE_HEADLINE} ${message}`,
    endpoint,
  };
}

function buildErrorResponse(
  code: SportmonksErrorCode,
  message: string,
  responseTimeMs: number,
  options?: {
    httpStatus?: number;
    activeSource?: ActiveDataSource;
    sportmonksDetail?: SportmonksFetchErrorDetail;
  }
): NextResponse<LiveMatchesErrorResponse> {
  const activeSource = options?.activeSource ?? resolveActiveDataSource();
  const detail =
    options?.sportmonksDetail ??
    (isSportmonksTokenConfigured()
      ? {
          httpStatus: options?.httpStatus,
          message: `${SPORTMONKS_FAILURE_HEADLINE} ${message}`,
          endpoint: sportmonksEndpointLabel(),
        }
      : undefined);

  const body: LiveMatchesErrorResponse = {
    ok: false,
    error: { code, message: detail?.message ?? message },
    matches: [],
    meta: {
      responseTimeMs,
      fetchedAt: new Date().toISOString(),
      activeSource,
      sportmonksTokenConfigured: isSportmonksTokenConfigured(),
      ...(detail ? { sportmonksError: detail } : {}),
    },
  };

  recordLiveFetchTelemetry({
    activeSource,
    sportmonksTokenConfigured: isSportmonksTokenConfigured(),
    seedEnabled: process.env.GP_SEED_LIVE === "true",
    lastFetchAt: body.meta.fetchedAt,
    lastFetchStatus: options?.httpStatus ?? errorStatusForCode(code),
    lastFetchEndpoint: detail?.endpoint ?? sportmonksEndpointLabel(),
    matchCount: 0,
    error: body.error.message,
    httpStatus: options?.httpStatus ?? null,
  });

  logError(ROUTE_SCOPE, message, { code, responseTimeMs, activeSource });

  return NextResponse.json(body, {
    status: options?.httpStatus ?? errorStatusForCode(code),
    headers: { "Cache-Control": "no-store" },
  });
}

function buildSuccessMeta(
  entry: { fetchedAt: number; rateLimitRemaining?: number; rateLimitResetsInSeconds?: number },
  activeSource: ActiveDataSource,
  count: number,
  responseTimeMs: number,
  cache: LiveMatchesCacheStatus,
  cacheAgeMs: number,
  cacheExpiresInMs: number,
  extra?: Partial<LiveMatchesSuccessResponse["meta"]>
): LiveMatchesSuccessResponse["meta"] {
  const empty = count === 0 && activeSource === "sportmonks";
  return {
    count,
    empty,
    responseTimeMs,
    fetchedAt: new Date(entry.fetchedAt).toISOString(),
    source: activeSource,
    activeSource,
    dataSourceBadge: metaBadgeFor(activeSource),
    rateLimitRemaining: entry.rateLimitRemaining,
    rateLimitResetsInSeconds: entry.rateLimitResetsInSeconds,
    cache,
    cacheAgeMs,
    cacheExpiresInMs,
    ...extra,
  };
}

async function buildSuccessFromCache(
  entry: LiveMatchesCacheEntry,
  cacheStatus: LiveMatchesCacheStatus,
  routeStartedAt: number,
  activeSource: ActiveDataSource = "sportmonks"
): Promise<NextResponse<LiveMatchesSuccessResponse>> {
  const now = Date.now();
  const cacheAgeMs = getCacheAgeMs(entry, now);
  const cacheExpiresInMs = getCacheExpiresInMs(entry, now);
  const totalMs = now - routeStartedAt;

  const engineResult = await processLiveEngineBatch(entry.matches, {
    dispatchTelegram: true,
  });

  const body: LiveMatchesSuccessResponse = {
    ok: true,
    matches: engineResult.matches,
    empty: engineResult.matches.length === 0 && activeSource === "sportmonks",
    signals: engineResult.signals,
    engine: engineResult.snapshot,
    dispatch: engineResult.snapshot.dispatch,
    meta: buildSuccessMeta(
      entry,
      activeSource,
      entry.matches.length,
      totalMs,
      cacheStatus,
      cacheAgeMs,
      cacheExpiresInMs
    ),
  };

  const logLabel =
    cacheStatus === "HIT" ? "CACHE HIT" : cacheStatus === "STALE" ? "CACHE STALE" : "CACHE MISS";
  const logFn = cacheStatus === "STALE" ? logWarn : logInfo;

  logFn(ROUTE_SCOPE, logLabel, {
    matchCount: entry.matches.length,
    cacheAgeMs,
    activeSource,
    totalMs,
  });

  recordLiveFetchTelemetry({
    activeSource,
    sportmonksTokenConfigured: isSportmonksTokenConfigured(),
    seedEnabled: process.env.GP_SEED_LIVE === "true",
    lastFetchAt: body.meta.fetchedAt,
    lastFetchStatus: 200,
    lastFetchEndpoint: sportmonksEndpointLabel(),
    matchCount: entry.matches.length,
    error: null,
    httpStatus: 200,
  });

  scheduleHistoricalPersistence(body.matches, body.meta, engineResult.signals);

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

async function runEngineOnMatches(matches: LiveMatchesSuccessResponse["matches"]) {
  return processLiveEngineBatch(matches, { dispatchTelegram: true });
}

async function fetchAndCacheMatches(
  routeStartedAt: number
): Promise<NextResponse<LiveMatchesSuccessResponse>> {
  const { fixtures, responseTimeMs, rateLimit, endpointUrlRedacted } =
    await fetchLiveFixtures();
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

  logInfo(ROUTE_SCOPE, "SportMonks fetch OK", {
    matchCount: matches.length,
    sportmonksMs: responseTimeMs,
    totalMs,
    endpoint: endpointUrlRedacted,
    rateLimit,
  });

  const engineResult = await runEngineOnMatches(matches);

  void persistLiveMatches(engineResult.matches).catch((err) => {
    logWarn(ROUTE_SCOPE, "Supabase persist failed", {
      message: err instanceof Error ? err.message : String(err),
    });
  });

  const body: LiveMatchesSuccessResponse = {
    ok: true,
    matches: engineResult.matches,
    empty: engineResult.matches.length === 0,
    signals: engineResult.signals,
    engine: engineResult.snapshot,
    dispatch: engineResult.snapshot.dispatch,
    meta: buildSuccessMeta(
      entry,
      "sportmonks",
      engineResult.matches.length,
      totalMs,
      "MISS",
      0,
      cacheExpiresInMs
    ),
  };

  logInfo(ROUTE_SCOPE, "SportMonks live-matches response", {
    matchCount: engineResult.matches.length,
    empty: body.empty,
    endpoint: endpointUrlRedacted,
    responseTimeMs: totalMs,
  });

  recordLiveFetchTelemetry({
    activeSource: "sportmonks",
    sportmonksTokenConfigured: true,
    seedEnabled: process.env.GP_SEED_LIVE === "true",
    lastFetchAt: body.meta.fetchedAt,
    lastFetchStatus: 200,
    lastFetchEndpoint: endpointUrlRedacted,
    matchCount: engineResult.matches.length,
    error: null,
    httpStatus: 200,
  });

  scheduleHistoricalPersistence(body.matches, body.meta, engineResult.signals);

  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  });
}

async function buildSeedLiveResponse(
  routeStartedAt: number
): Promise<NextResponse<LiveMatchesSuccessResponse>> {
  const matches = await loadSeedLiveMatches();
  const engineResult = await processLiveEngineBatch(matches, { dispatchTelegram: false });
  const totalMs = Date.now() - routeStartedAt;
  const fetchedAt = Date.now();

  const entry = setLiveMatchesCacheEntry({
    matches: engineResult.matches,
    fetchedAt,
  });

  const body: LiveMatchesSuccessResponse = {
    ok: true,
    matches: engineResult.matches,
    signals: engineResult.signals,
    engine: engineResult.snapshot,
    dispatch: engineResult.snapshot.dispatch,
    meta: buildSuccessMeta(
      entry,
      "seed",
      engineResult.matches.length,
      totalMs,
      "MISS",
      0,
      getCacheExpiresInMs(entry, Date.now()),
      {
        warning:
          "GP_SEED_LIVE=true e sem SPORTMONKS_API_TOKEN — dados seed do Supabase (não é SportMonks).",
      }
    ),
  };

  recordLiveFetchTelemetry({
    activeSource: "seed",
    sportmonksTokenConfigured: false,
    seedEnabled: true,
    lastFetchAt: body.meta.fetchedAt,
    lastFetchStatus: 200,
    lastFetchEndpoint: null,
    matchCount: engineResult.matches.length,
    error: null,
    httpStatus: 200,
  });

  scheduleHistoricalPersistence(body.matches, body.meta, engineResult.signals);

  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}

/**
 * GET /api/live-matches
 *
 * 1. SPORTMONKS_API_TOKEN → somente SportMonks (sem seed, sem cache stale em falha).
 * 2. Falha SportMonks → erro explícito com HTTP, mensagem e endpoint.
 * 3. Seed só com GP_SEED_LIVE=true e sem token.
 */
export async function GET(): Promise<NextResponse<LiveMatchesApiResponse>> {
  const routeStartedAt = Date.now();
  const activeSource = resolveActiveDataSource();

  logInfo(ROUTE_SCOPE, "Request started", {
    ttlMs: LIVE_MATCHES_CACHE_TTL_MS,
    activeSource,
    seedAllowed: isSeedAllowed(),
    seedLiveEnv: isSeedLiveModeEnabled(),
    tokenConfigured: isSportmonksTokenConfigured(),
  });

  if (isSeedAllowed()) {
    return buildSeedLiveResponse(routeStartedAt);
  }

  if (activeSource === "none") {
    const responseTimeMs = Date.now() - routeStartedAt;
    return buildErrorResponse(
      "MISSING_TOKEN",
      "Configure SPORTMONKS_API_TOKEN ou GP_SEED_LIVE=true (apenas sem token).",
      responseTimeMs,
      { activeSource: "none", httpStatus: 503 }
    );
  }

  const cached = getLiveMatchesCacheEntry();
  if (cached && isLiveMatchesCacheValid(cached)) {
    return await buildSuccessFromCache(cached, "HIT", routeStartedAt, "sportmonks");
  }

  try {
    return await fetchAndCacheMatches(routeStartedAt);
  } catch (error) {
    const responseTimeMs = Date.now() - routeStartedAt;
    const detail = buildSportmonksErrorDetail(error);

    if (isSportmonksTokenConfigured()) {
      if (isSportmonksServiceError(error)) {
        return buildErrorResponse(error.code, detail.message, responseTimeMs, {
          httpStatus: error.statusCode ?? errorStatusForCode(error.code),
          activeSource: "sportmonks",
          sportmonksDetail: detail,
        });
      }

      return buildErrorResponse("NETWORK_ERROR", detail.message, responseTimeMs, {
        httpStatus: 502,
        activeSource: "sportmonks",
        sportmonksDetail: detail,
      });
    }

    if (cached) {
      return await buildSuccessFromCache(cached, "STALE", routeStartedAt, "sportmonks");
    }

    if (isSportmonksServiceError(error)) {
      return buildErrorResponse(error.code, error.message, responseTimeMs, {
        httpStatus: error.statusCode ?? errorStatusForCode(error.code),
        activeSource: "sportmonks",
        sportmonksDetail: detail,
      });
    }

    const message =
      error instanceof Error ? error.message : "Unexpected server error.";

    return buildErrorResponse("NETWORK_ERROR", message, responseTimeMs, {
      activeSource: "sportmonks",
      sportmonksDetail: detail,
    });
  }
}
