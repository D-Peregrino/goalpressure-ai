import type { LiveMatchesCacheStatus } from "@/lib/cache/liveMatchesCache";
import type { Match, Signal } from "@/types/domain";
import type { LiveEngineSnapshot } from "@/types/engine";
import type { SportmonksErrorCode } from "@/lib/utils/sportmonksErrors";

export interface LiveMatchesApiMeta {
  count: number;
  responseTimeMs: number;
  fetchedAt: string;
  source: "sportmonks";
  rateLimitRemaining?: number;
  rateLimitResetsInSeconds?: number;
  cache?: LiveMatchesCacheStatus;
  warning?: string;
  cacheAgeMs?: number;
  cacheExpiresInMs?: number;
  activeFixtures?: number;
}

export interface LiveMatchesSuccessResponse {
  ok: true;
  matches: Match[];
  signals?: Signal[];
  engine?: LiveEngineSnapshot;
  meta: LiveMatchesApiMeta;
}

export interface LiveMatchesErrorBody {
  code: SportmonksErrorCode;
  message: string;
}

export interface LiveMatchesErrorResponse {
  ok: false;
  error: LiveMatchesErrorBody;
  matches: [];
  meta: {
    responseTimeMs: number;
    fetchedAt: string;
  };
}

export type LiveMatchesApiResponse =
  | LiveMatchesSuccessResponse
  | LiveMatchesErrorResponse;
