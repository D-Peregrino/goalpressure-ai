import type { LiveMatchesCacheStatus } from "@/lib/cache/liveMatchesCache";
import type { ActiveDataSource } from "@/lib/data-source/config";
import type { Match, Signal } from "@/types/domain";
import type { LiveEngineSnapshot } from "@/types/engine";
import type { SportmonksErrorCode } from "@/lib/utils/sportmonksErrors";

export interface SportmonksFetchErrorDetail {
  httpStatus?: number;
  message: string;
  endpoint?: string;
}

export interface LiveMatchesApiMeta {
  count: number;
  responseTimeMs: number;
  fetchedAt: string;
  /** Fonte persistida no payload (legado: sempre sportmonks em cache antigo). */
  source: ActiveDataSource;
  /** Fonte efetiva desta resposta. */
  activeSource: ActiveDataSource;
  dataSourceBadge?: string;
  sportmonksError?: SportmonksFetchErrorDetail;
  rateLimitRemaining?: number;
  rateLimitResetsInSeconds?: number;
  cache?: LiveMatchesCacheStatus;
  warning?: string;
  cacheAgeMs?: number;
  cacheExpiresInMs?: number;
  activeFixtures?: number;
  /** true quando SportMonks respondeu OK mas sem fixtures in-play */
  empty?: boolean;
}

export interface LiveMatchesSuccessResponse {
  ok: true;
  matches: Match[];
  /** true se matches.length === 0 e fonte é SportMonks real */
  empty?: boolean;
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
    activeSource: ActiveDataSource;
    sportmonksTokenConfigured?: boolean;
    sportmonksError?: SportmonksFetchErrorDetail;
  };
}

export type LiveMatchesApiResponse =
  | LiveMatchesSuccessResponse
  | LiveMatchesErrorResponse;
