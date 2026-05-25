/**
 * Direct SportMonks ingest for runtime polling (no HTTP loopback).
 */

import { isSportmonksTokenConfigured } from "@/lib/data-source/config";
import { mapSportmonksFixturesToMatches } from "@/lib/mappers/sportmonks";
import { processLiveEngineBatch } from "@/lib/engine/liveEnginePipeline";
import { fetchLiveFixtures } from "@/lib/sportmonks/client";
import {
  getLiveMatchesCacheEntry,
  isLiveMatchesCacheValid,
  setLiveMatchesCacheEntry,
} from "@/lib/cache/liveMatchesCache";
import { isSportmonksServiceError } from "@/lib/utils/sportmonksErrors";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { LiveMatchesApiMeta } from "@/types/api";
import type { Match, Signal } from "@/types/domain";
import type { LiveEngineSnapshot } from "@/types/engine";

const LOG_SCOPE = "live-fetch-direct";

export interface DirectLiveFetchResult {
  ok: boolean;
  matches: Match[];
  signals: Signal[];
  engine: LiveEngineSnapshot;
  meta: LiveMatchesApiMeta;
  error?: string;
  fromCache?: boolean;
}

export async function fetchLiveMatchesDirect(options?: {
  modelId?: string;
  useCache?: boolean;
  /** Runtime polling: bypass TTL cache so all in-play fixtures are processed each cycle */
  forceFresh?: boolean;
  /** When false, Telegram is handled by runtime signalDispatcher (polling path) */
  dispatchTelegram?: boolean;
}): Promise<DirectLiveFetchResult> {
  const dispatchTelegram = options?.dispatchTelegram !== false;
  const startedAt = Date.now();
  const useCache =
    options?.forceFresh === true ? false : options?.useCache !== false;

  if (useCache) {
    const cached = getLiveMatchesCacheEntry();
    if (cached && isLiveMatchesCacheValid(cached)) {
      const engineResult = await processLiveEngineBatch(cached.matches, {
        dispatchTelegram,
        modelId: options?.modelId,
      });

      return {
        ok: true,
        matches: engineResult.matches,
        signals: engineResult.signals,
        engine: engineResult.snapshot,
        fromCache: true,
        meta: {
          count: engineResult.matches.length,
          responseTimeMs: Date.now() - startedAt,
          fetchedAt: new Date(cached.fetchedAt).toISOString(),
          source: "sportmonks",
          activeSource: "sportmonks",
          cache: "HIT",
          rateLimitRemaining: cached.rateLimitRemaining,
          rateLimitResetsInSeconds: cached.rateLimitResetsInSeconds,
          activeFixtures: engineResult.matches.length,
        },
      };
    }
  }

  try {
    const { fixtures, responseTimeMs, rateLimit } = await fetchLiveFixtures();
    const mapped = mapSportmonksFixturesToMatches(fixtures);
    const fetchedAt = Date.now();

    setLiveMatchesCacheEntry({
      matches: mapped,
      fetchedAt,
      rateLimitRemaining: rateLimit?.remaining,
      rateLimitResetsInSeconds: rateLimit?.resetsInSeconds,
    });

    const engineResult = await processLiveEngineBatch(mapped, {
      dispatchTelegram,
      modelId: options?.modelId,
    });

    logInfo(LOG_SCOPE, "Direct SportMonks fetch OK", {
      fixtures: fixtures.length,
      matches: mapped.length,
      signals: engineResult.signals.length,
      sportmonksMs: responseTimeMs,
      premiumActive: mapped.filter((m) => m.premium?.statisticsAvailable).length,
      withOdds: mapped.filter((m) => m.premium?.oddsAvailable).length,
    });

    return {
      ok: true,
      matches: engineResult.matches,
      signals: engineResult.signals,
      engine: engineResult.snapshot,
      meta: {
        count: engineResult.matches.length,
        responseTimeMs: Date.now() - startedAt,
        fetchedAt: new Date(fetchedAt).toISOString(),
        source: "sportmonks",
        activeSource: "sportmonks",
        cache: "MISS",
        rateLimitRemaining: rateLimit?.remaining,
        rateLimitResetsInSeconds: rateLimit?.resetsInSeconds,
        activeFixtures: mapped.length,
      },
    };
  } catch (error) {
    const message = isSportmonksServiceError(error)
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : "SportMonks fetch failed";

    logWarn(LOG_SCOPE, "SportMonks fetch failed — fallback to cache if any", {
      message,
    });

    const cached = getLiveMatchesCacheEntry();
    if (cached && !isSportmonksTokenConfigured()) {
      const engineResult = await processLiveEngineBatch(cached.matches, {
        dispatchTelegram: false,
        modelId: options?.modelId,
      });

      return {
        ok: true,
        matches: engineResult.matches,
        signals: engineResult.signals,
        engine: engineResult.snapshot,
        fromCache: true,
        error: message,
        meta: {
          count: engineResult.matches.length,
          responseTimeMs: Date.now() - startedAt,
          fetchedAt: new Date(cached.fetchedAt).toISOString(),
          source: "sportmonks",
          activeSource: "sportmonks",
          cache: "STALE",
          warning: message,
        },
      };
    }

    const emptyEngine = await processLiveEngineBatch([], { dispatchTelegram: false });

    return {
      ok: false,
      matches: [],
      signals: [],
      engine: emptyEngine.snapshot,
      error: message,
      meta: {
        count: 0,
        responseTimeMs: Date.now() - startedAt,
        fetchedAt: new Date().toISOString(),
        source: "sportmonks",
        activeSource: "sportmonks",
        warning: message,
      },
    };
  }
}
