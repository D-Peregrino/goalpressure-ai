/**
 * Institutional SportMonks integration audit — logging and diagnostics.
 */

import type {
  SportmonksIncludeProfile,
  SportmonksInplayResult,
} from "@/lib/services/sportmonks";

const INPLAY_PATH = "/livescores/inplay";

const IDEAL_INCLUDES = [
  "participants",
  "scores",
  "league",
  "state",
  "periods",
  "statistics",
  "inplayOdds",
] as const;
import { mapSportmonksFixturesToMatches } from "@/lib/mappers/sportmonks";
import type { SportmonksFixture } from "@/lib/mappers/sportmonks";

const AUDIT_SCOPE = "sportmonks-audit";
const LIVESCORES_TODAY_PATH = "/livescores";
const DEFAULT_BASE_URL = "https://api.sportmonks.com/v3/football";

const LIVE_STATE_HINTS = new Set([
  "LIVE",
  "INPLAY",
  "INPLAY_ET",
  "INPLAY_1ST_HALF",
  "INPLAY_2ND_HALF",
  "HT",
  "BREAK",
  "EXTRA_TIME",
  "IN PLAY",
]);

export interface SportmonksDebugResponse {
  endpoint: string;
  includes: string[];
  liveMatchesReturned: number | null;
  expectedLiveMatchesEstimate: number | null;
  rateLimitRemaining: number | null;
  coverageStatus: string;
  probablePlanLimitation: string | null;
  probableCause: string | null;
  sampleFixtureIds: (number | string)[];
  /** Extended institutional fields */
  timestamp: string;
  ok: boolean;
  endpointUrlRedacted: string | null;
  requestParameters: Record<string, string>;
  idealIncludes: string[];
  removedIncludes: string[];
  minimalPayloadMode: boolean | null;
  afterMapperCount: number | null;
  excludedByMapperCount: number | null;
  todayLivescoresTotal: number | null;
  todayLikelyInplayCount: number | null;
  uniqueLeaguesInResponse: number | null;
  leagueSample: string[];
  filtersAppliedByApp: string[];
  oddsStatsFilters: string[];
  configuredPlanName: string | null;
  configuredMonthlyQuota: number | null;
  subscriptionHint: unknown | null;
  errorMessage: string | null;
}

export interface SportmonksAuditLogPayload {
  endpointUrlRedacted: string;
  parameters: Record<string, string>;
  includes: string[];
  returnedCount: number;
  expectedEstimate: number | null;
  estimatedCoverage: string;
  afterMapperCount?: number;
  rateLimitRemaining?: number | null;
}

/** Logs with exact prefix requested for Railway / ops grep. */
export function logSportmonksAudit(
  message: string,
  meta?: Record<string, unknown>
): void {
  if (meta && Object.keys(meta).length > 0) {
    console.info(`[${AUDIT_SCOPE}] ${message}`, meta);
  } else {
    console.info(`[${AUDIT_SCOPE}] ${message}`);
  }
}

function getBaseUrl(): string {
  return (process.env.SPORTMONKS_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/$/,
    ""
  );
}

function redactUrl(url: string): string {
  return url.replace(/api_token=[^&]+/i, "api_token=***");
}

function isLikelyLiveFixture(fixture: SportmonksFixture): boolean {
  const stateName = (
    fixture.state?.state ??
    fixture.state?.name ??
    fixture.state?.short_name ??
    ""
  )
    .toUpperCase()
    .trim();

  if (stateName && LIVE_STATE_HINTS.has(stateName)) return true;
  if (stateName.includes("INPLAY") || stateName.includes("LIVE")) return true;

  const liveStateIds = new Set([2, 3, 6, 16, 17, 18, 19, 22]);
  return typeof fixture.state_id === "number" && liveStateIds.has(fixture.state_id);
}

function uniqueLeagues(fixtures: SportmonksFixture[]): string[] {
  const names = new Set<string>();
  for (const f of fixtures) {
    const name = f.league?.name?.trim();
    if (name) names.add(name);
  }
  return [...names].sort();
}

async function probeTodayLivescores(
  token: string,
  timeoutMs: number
): Promise<{ total: number; likelyInplay: number } | null> {
  const url = new URL(`${getBaseUrl()}${LIVESCORES_TODAY_PATH}`);
  url.searchParams.set("api_token", token);
  url.searchParams.set("include", "state;league");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    const bodyText = await response.text();
    if (!response.ok) {
      logSportmonksAudit("Today livescores probe failed", {
        httpStatus: response.status,
        endpoint: redactUrl(url.toString()),
        snippet: bodyText.slice(0, 200),
      });
      return null;
    }

    const body = JSON.parse(bodyText) as { data?: SportmonksFixture[] };
    const data = Array.isArray(body.data) ? body.data : [];
    const likelyInplay = data.filter(isLikelyLiveFixture).length;

    logSportmonksAudit("Today livescores probe OK", {
      endpoint: redactUrl(url.toString()),
      todayTotal: data.length,
      todayLikelyInplay: likelyInplay,
    });

    return { total: data.length, likelyInplay };
  } catch (error) {
    logSportmonksAudit("Today livescores probe error", {
      message: error instanceof Error ? error.message : "probe_failed",
    });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

function resolvePlanLimitation(
  profile: SportmonksIncludeProfile | null,
  planName: string | null
): string | null {
  const parts: string[] = [];

  if (profile?.removedIncludes?.length) {
    parts.push(
      `Includes indisponíveis no plano ou no endpoint inplay: ${profile.removedIncludes.join(", ")}`
    );
  }

  if (profile?.minimalPayloadMode) {
    parts.push(
      "Modo payload mínimo ativo — statistics e/ou inplayOdds não entregues (pressure/odds degradados, não reduz contagem de jogos)"
    );
  }

  const plan = (planName ?? "").toLowerCase();
  if (plan.includes("starter")) {
    parts.push("Plano Starter: até ~5 ligas na assinatura SportMonks");
  } else if (plan.includes("growth")) {
    parts.push("Plano Growth: até ~30 ligas");
  } else if (plan.includes("european")) {
    parts.push(
      "Plano European (legado): cobertura regional limitada vs Pro/Enterprise global"
    );
  }

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

function resolveProbableCause(params: {
  inplayReturned: number;
  mappedCount: number;
  excludedCount: number;
  todayTotal: number | null;
  todayLikelyInplay: number | null;
  uniqueLeagues: number;
  profile: SportmonksIncludeProfile | null;
}): string {
  const {
    inplayReturned,
    mappedCount,
    excludedCount,
    todayTotal,
    todayLikelyInplay,
    uniqueLeagues,
    profile,
  } = params;

  if (excludedCount > 0) {
    return `${excludedCount} fixture(s) descartado(s) no mapper por id inválido — redução local, não SportMonks.`;
  }

  if (inplayReturned !== mappedCount) {
    return `Divergência mapper (${inplayReturned} → ${mappedCount}) — investigar payload.`;
  }

  if (inplayReturned <= 3) {
    const todayHint =
      todayLikelyInplay != null && todayTotal != null
        ? ` Hoje o endpoint /livescores retorna ${todayTotal} jogos (${todayLikelyInplay} com estado provável in-play); o endpoint /inplay retorna apenas o subconjunto ativo agora.`
        : "";

    if (
      todayLikelyInplay != null &&
      todayLikelyInplay > inplayReturned + 5
    ) {
      return (
        `SportMonks /livescores/inplay devolveu ${inplayReturned} jogos neste instante. GoalPressure não aplica filtro de liga/status após o ingest — a API já entrega só in-play (±15 min).` +
        ` Há mais jogos no dia, mas poucos simultaneamente in-play.${todayHint}`
      );
    }

    return (
      `SportMonks retornou ${inplayReturned} jogos in-play para ${uniqueLeagues} liga(s) cobertas pelo token.` +
      ` Não há filtro adicional no backend; baixo volume reflete agenda real + cobertura do plano (${profile?.activeIncludes.join(";") || "includes em descoberta"}).${todayHint}`
    );
  }

  return (
    `Volume in-play (${inplayReturned}) alinhado ao retorno SportMonks. Sem filtros locais de liga/odds/stats no ingest.`
  );
}

function resolveCoverageStatus(
  inplayCount: number,
  uniqueLeagueCount: number,
  todayLikelyInplay: number | null
): string {
  if (inplayCount === 0) return "EMPTY_INPLAY";
  if (uniqueLeagueCount <= 2 && inplayCount <= 3) {
    return "NARROW_COVERAGE_OR_LOW_CONCURRENCY";
  }
  if (
    todayLikelyInplay != null &&
    todayLikelyInplay > inplayCount * 3
  ) {
    return "API_INPLAY_SUBSET_OF_TODAY_SCHEDULE";
  }
  return "NORMAL";
}

export function emitSportmonksAuditLog(payload: SportmonksAuditLogPayload): void {
  logSportmonksAudit("request completed", {
    url: payload.endpointUrlRedacted,
    parameters: payload.parameters,
    includes: payload.includes,
    returnedCount: payload.returnedCount,
    expectedEstimate: payload.expectedEstimate,
    estimatedCoverage: payload.estimatedCoverage,
    afterMapperCount: payload.afterMapperCount,
    rateLimitRemaining: payload.rateLimitRemaining ?? null,
  });
}

export async function buildSportmonksDebugReport(
  fetchResult: SportmonksInplayResult | null,
  fetchError: string | null,
  options?: { probeToday?: boolean }
): Promise<SportmonksDebugResponse> {
  const timestamp = new Date().toISOString();
  const planName = process.env.SPORTMONKS_PLAN_NAME?.trim() || null;
  const quotaRaw = process.env.SPORTMONKS_MONTHLY_QUOTA;
  const quotaParsed = quotaRaw ? Number.parseInt(quotaRaw, 10) : NaN;
  const configuredMonthlyQuota =
    Number.isFinite(quotaParsed) && quotaParsed > 0 ? quotaParsed : null;

  const filtersAppliedByApp = [
    "Nenhum filtro de liga/status na URL SportMonks",
    "Mapper: apenas descarta fixtures sem id numérico",
    "Sem filtro de odds/stats no ingest (odds opcional via include inplayOdds)",
  ];

  const oddsStatsFilters = [
    "statistics: include tier (removido se plano retorna 422)",
    "inplayOdds: include tier (removido se plano retorna 422)",
    "odds: include legado — NÃO usado (causa HTTP 422 no inplay)",
  ];

  if (!fetchResult) {
    return {
      ok: false,
      timestamp,
      endpoint: `${getBaseUrl()}${INPLAY_PATH}`,
      includes: [],
      liveMatchesReturned: null,
      expectedLiveMatchesEstimate: null,
      rateLimitRemaining: null,
      coverageStatus: "FETCH_FAILED",
      probablePlanLimitation: resolvePlanLimitation(null, planName),
      probableCause: fetchError ?? "Falha ao consultar SportMonks",
      sampleFixtureIds: [],
      endpointUrlRedacted: null,
      requestParameters: { api_token: "***" },
      idealIncludes: [...IDEAL_INCLUDES],
      removedIncludes: [],
      minimalPayloadMode: null,
      afterMapperCount: null,
      excludedByMapperCount: null,
      todayLivescoresTotal: null,
      todayLikelyInplayCount: null,
      uniqueLeaguesInResponse: null,
      leagueSample: [],
      filtersAppliedByApp,
      oddsStatsFilters,
      configuredPlanName: planName,
      configuredMonthlyQuota,
      subscriptionHint: null,
      errorMessage: fetchError,
    };
  }

  const { fixtures, includeProfile, endpointUrlRedacted, rateLimit, subscriptionHint } =
    fetchResult;

  const mapped = mapSportmonksFixturesToMatches(fixtures);
  const excludedByMapperCount = fixtures.length - mapped.length;
  const leagues = uniqueLeagues(fixtures);
  const sampleFixtureIds = fixtures.slice(0, 12).map((f) => f.id);

  let todayLivescoresTotal: number | null = null;
  let todayLikelyInplayCount: number | null = null;

  if (options?.probeToday !== false) {
    const token = process.env.SPORTMONKS_API_TOKEN?.trim();
    const timeoutMs = Number.parseInt(
      process.env.SPORTMONKS_FETCH_TIMEOUT_MS ?? "15000",
      10
    );
    if (token && token !== "COLE_SEU_TOKEN_AQUI") {
      const probe = await probeTodayLivescores(token, timeoutMs);
      if (probe) {
        todayLivescoresTotal = probe.total;
        todayLikelyInplayCount = probe.likelyInplay;
      }
    }
  }

  const expectedLiveMatchesEstimate =
    todayLikelyInplayCount != null
      ? todayLikelyInplayCount
      : fixtures.length;

  const coverageStatus = resolveCoverageStatus(
    fixtures.length,
    leagues.length,
    todayLikelyInplayCount
  );

  const probableCause = resolveProbableCause({
    inplayReturned: fixtures.length,
    mappedCount: mapped.length,
    excludedCount: excludedByMapperCount,
    todayTotal: todayLivescoresTotal,
    todayLikelyInplay: todayLikelyInplayCount,
    uniqueLeagues: leagues.length,
    profile: includeProfile,
  });

  emitSportmonksAuditLog({
    endpointUrlRedacted: endpointUrlRedacted,
    parameters: {
      api_token: "***",
      include: includeProfile.activeIncludes.join(";") || "(none)",
    },
    includes: includeProfile.activeIncludes,
    returnedCount: fixtures.length,
    expectedEstimate: expectedLiveMatchesEstimate,
    estimatedCoverage: coverageStatus,
    afterMapperCount: mapped.length,
    rateLimitRemaining: rateLimit?.remaining ?? null,
  });

  return {
    ok: true,
    timestamp,
    endpoint: `${getBaseUrl()}${INPLAY_PATH}`,
    includes: includeProfile.activeIncludes,
    liveMatchesReturned: fixtures.length,
    expectedLiveMatchesEstimate,
    rateLimitRemaining: rateLimit?.remaining ?? null,
    coverageStatus,
    probablePlanLimitation: resolvePlanLimitation(includeProfile, planName),
    probableCause,
    sampleFixtureIds,
    endpointUrlRedacted,
    requestParameters: {
      api_token: "***",
      include: includeProfile.activeIncludes.join(";") || "(none)",
    },
    idealIncludes: [...IDEAL_INCLUDES],
    removedIncludes: includeProfile.removedIncludes,
    minimalPayloadMode: includeProfile.minimalPayloadMode,
    afterMapperCount: mapped.length,
    excludedByMapperCount,
    todayLivescoresTotal,
    todayLikelyInplayCount,
    uniqueLeaguesInResponse: leagues.length,
    leagueSample: leagues.slice(0, 15),
    filtersAppliedByApp,
    oddsStatsFilters,
    configuredPlanName: planName,
    configuredMonthlyQuota,
    subscriptionHint: subscriptionHint ?? null,
    errorMessage: fetchError,
  };
}
