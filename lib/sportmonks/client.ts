/**
 * Cliente SportMonks v3 Football — server-side only.
 * @see https://docs.sportmonks.com/v3/
 */

import {
  fetchInplayFixtures,
  INPLAY_PATH,
  type SportmonksInplayResult,
} from "@/lib/services/sportmonks";
import {
  getSportmonksApiToken,
  getSportmonksBaseUrl,
  isSportmonksTokenConfigured,
} from "@/lib/data-source/config";
import { SportmonksServiceError } from "@/lib/utils/sportmonksErrors";

export { INPLAY_PATH };
export type { SportmonksInplayResult };

export function sportmonksClientConfig() {
  return {
    tokenConfigured: isSportmonksTokenConfigured(),
    baseUrl: getSportmonksBaseUrl(),
    inplayPath: INPLAY_PATH,
  };
}

/** Busca jogos ao vivo (in-play) com includes resilientes. */
export async function fetchLiveFixtures(): Promise<SportmonksInplayResult> {
  return fetchInplayFixtures();
}

export type SportmonksDiagnosticResult = {
  tokenConfigured: boolean;
  baseUrl: string;
  endpoint: string;
  endpointTested: string;
  httpStatus: number | null;
  matchCount: number;
  activeIncludes: string[];
  removedIncludes: string[];
  firstFixtureSample: Record<string, unknown> | null;
  error: string | null;
  responseTimeMs: number | null;
};

function redactUrl(url: string): string {
  return url.replace(/api_token=[^&]+/i, "api_token=***");
}

/**
 * Diagnóstico de conectividade SportMonks (in-play).
 */
export async function runSportmonksDiagnostic(): Promise<SportmonksDiagnosticResult> {
  const baseUrl = getSportmonksBaseUrl();
  const endpoint = `${baseUrl}${INPLAY_PATH}`;
  const tokenConfigured = isSportmonksTokenConfigured();

  if (!tokenConfigured) {
    return {
      tokenConfigured: false,
      baseUrl,
      endpoint,
      endpointTested: redactUrl(`${endpoint}?api_token=***`),
      httpStatus: null,
      matchCount: 0,
      activeIncludes: [],
      removedIncludes: [],
      firstFixtureSample: null,
      error: "SPORTMONKS_API_TOKEN não configurado.",
      responseTimeMs: null,
    };
  }

  try {
    const result = await fetchInplayFixtures();
    const first = result.fixtures[0];
    const sample = first
      ? {
          id: first.id,
          name: first.name ?? null,
          league: first.league?.name ?? null,
          state: first.state?.name ?? first.state?.short_name ?? null,
          participants: (first.participants ?? []).map((p) => ({
            id: p.id,
            name: p.name,
            location: p.meta?.location,
          })),
          hasStatistics: Boolean(first.statistics?.length),
          hasInplayOdds: Boolean(first.inplayOdds?.length ?? first.odds?.length),
        }
      : null;

    return {
      tokenConfigured: true,
      baseUrl,
      endpoint,
      endpointTested: result.endpointUrlRedacted,
      httpStatus: 200,
      matchCount: result.fixtures.length,
      activeIncludes: result.includeProfile.activeIncludes,
      removedIncludes: result.includeProfile.removedIncludes,
      firstFixtureSample: sample,
      error: null,
      responseTimeMs: result.responseTimeMs,
    };
  } catch (error) {
    const httpStatus =
      error instanceof SportmonksServiceError ? error.statusCode ?? null : null;
    const message =
      error instanceof Error ? error.message : "Erro desconhecido ao contactar SportMonks.";

    return {
      tokenConfigured: true,
      baseUrl,
      endpoint,
      endpointTested: redactUrl(`${endpoint}?api_token=***&include=participants;scores`),
      httpStatus,
      matchCount: 0,
      activeIncludes: [],
      removedIncludes: [],
      firstFixtureSample: null,
      error: message,
      responseTimeMs: null,
    };
  }
}
