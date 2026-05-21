/**
 * Sportmonks HTTP client (server-side only).
 * Resilient include discovery — avoids HTTP 422 from invalid includes on inplay livescores.
 * @see https://docs.sportmonks.com/v3/endpoints-and-entities/endpoints/livescores/get-inplay-livescores
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import { recordApiUsageEvent } from "@/lib/api/apiUsageMonitor";
import { SportmonksServiceError } from "@/lib/utils/sportmonksErrors";
import { logError, logInfo, logWarn } from "@/lib/utils/logger";

const DEFAULT_BASE_URL = "https://api.sportmonks.com/v3/football";
const INPLAY_PATH = "/livescores/inplay";
const DEFAULT_TIMEOUT_MS = 15_000;

/** Full include set we aim for (richest payload). */
export const IDEAL_INCLUDES = [
  "participants",
  "scores",
  "league",
  "state",
  "periods",
  "statistics",
  "inplayOdds",
] as const;

/** Legacy invalid on inplay endpoint — kept for diagnostics only. */
const DEPRECATED_INCLUDES = ["odds"] as const;

/**
 * Tiers tried from richest → minimal when a tier returns HTTP 422.
 * Step 1: no includes · Step 2–4: core · Step 5–6: statistics / inplayOdds if plan allows.
 */
const INCLUDE_TIERS_DESCENDING: readonly string[][] = [
  ["participants", "scores", "league", "state", "periods", "statistics", "inplayOdds"],
  ["participants", "scores", "league", "state", "periods", "statistics"],
  ["participants", "scores", "league", "state", "periods"],
  ["participants", "scores", "league", "state"],
  ["participants", "scores"],
  ["participants"],
  [],
];

export const MINIMAL_PAYLOAD_MODE = "MINIMAL_PAYLOAD_MODE" as const;

export interface SportmonksRateLimit {
  remaining?: number;
  resetsInSeconds?: number;
}

export interface SportmonksIncludeProfile {
  activeIncludes: string[];
  removedIncludes: string[];
  minimalPayloadMode: boolean;
  approvedTierIndex: number;
}

export interface SportmonksInplayResult {
  fixtures: SportmonksFixture[];
  responseTimeMs: number;
  rateLimit?: SportmonksRateLimit;
  includeProfile: SportmonksIncludeProfile;
  endpointUrlRedacted: string;
}

interface SportmonksListResponse {
  data?: unknown;
  message?: string;
  rate_limit?: {
    remaining?: number;
    resets_in_seconds?: number;
  };
  subscription?: unknown;
}

interface FetchAttemptResult {
  ok: boolean;
  status: number;
  body: SportmonksListResponse;
  bodyText: string;
  responseTimeMs: number;
  endpointUrlRedacted: string;
  includes: string[];
}

/** Cached include profile for this Node process (reduces probe calls). */
let resolvedIncludeProfile: SportmonksIncludeProfile | null = null;

function getApiToken(): string {
  const token = process.env.SPORTMONKS_API_TOKEN?.trim();
  if (!token || token === "COLE_SEU_TOKEN_AQUI") {
    throw new SportmonksServiceError(
      "MISSING_TOKEN",
      "SPORTMONKS_API_TOKEN is not set. Add it to .env.local."
    );
  }
  return token;
}

function getBaseUrl(): string {
  return (process.env.SPORTMONKS_API_BASE_URL ?? DEFAULT_BASE_URL).replace(
    /\/$/,
    ""
  );
}

function getTimeoutMs(): number {
  const raw = process.env.SPORTMONKS_FETCH_TIMEOUT_MS;
  if (!raw) return DEFAULT_TIMEOUT_MS;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function buildInplayUrl(token: string, includes: string[]): string {
  const url = new URL(`${getBaseUrl()}${INPLAY_PATH}`);
  url.searchParams.set("api_token", token);
  if (includes.length > 0) {
    url.searchParams.set("include", includes.join(";"));
  }
  return url.toString();
}

function redactUrl(url: string): string {
  return url.replace(/api_token=[^&]+/i, "api_token=***");
}

function parseRateLimit(body: SportmonksListResponse): SportmonksRateLimit | undefined {
  const rl = body.rate_limit;
  if (!rl) return undefined;
  return {
    remaining: rl.remaining,
    resetsInSeconds: rl.resets_in_seconds,
  };
}

function assertValidPayload(body: unknown): SportmonksFixture[] {
  if (body === null || typeof body !== "object") {
    throw new SportmonksServiceError(
      "INVALID_PAYLOAD",
      "Sportmonks response is not a JSON object.",
      { details: body }
    );
  }

  const record = body as SportmonksListResponse;

  const missingData =
    !("data" in record) || record.data === undefined || record.data === null;

  if (missingData) {
    const msg = (record.message ?? "").toLowerCase();
    if (
      msg.includes("no result") ||
      msg.includes("not return any results") ||
      msg.includes("no in-play") ||
      msg.includes("no livescores")
    ) {
      logWarn("sportmonks", "No in-play results in Sportmonks response", {
        message: record.message,
      });
      return [];
    }

    throw new SportmonksServiceError(
      "INVALID_PAYLOAD",
      'Sportmonks response missing "data" field.',
      { details: record }
    );
  }

  if (!Array.isArray(record.data)) {
    throw new SportmonksServiceError(
      "INVALID_PAYLOAD",
      'Sportmonks "data" is not an array.',
      { details: typeof record.data }
    );
  }

  return record.data as SportmonksFixture[];
}

function buildIncludeProfile(
  activeIncludes: string[],
  approvedTierIndex: number
): SportmonksIncludeProfile {
  const removedIncludes = IDEAL_INCLUDES.filter(
    (inc) => !activeIncludes.includes(inc)
  );

  const minimalPayloadMode =
    !activeIncludes.includes("statistics") ||
    !activeIncludes.includes("inplayOdds");

  return {
    activeIncludes,
    removedIncludes: [...removedIncludes],
    minimalPayloadMode,
    approvedTierIndex,
  };
}

function isIncludeTierRejected(
  status: number,
  body: SportmonksListResponse,
  bodyText: string
): boolean {
  if (status === 422) return true;

  if (status === 403 || status === 400) {
    const msg = `${body.message ?? ""} ${bodyText}`.toLowerCase();
    return (
      msg.includes("include") ||
      msg.includes("not allowed") ||
      msg.includes("do not have access")
    );
  }

  return false;
}

function mapHttpStatusToError(
  status: number,
  bodyText: string,
  includes: string[]
): SportmonksServiceError {
  if (status === 401) {
    return new SportmonksServiceError(
      "HTTP_ERROR",
      "Sportmonks authentication failed. Check SPORTMONKS_API_TOKEN.",
      { statusCode: status, details: bodyText.slice(0, 500) }
    );
  }

  if (status === 403) {
    return new SportmonksServiceError(
      "HTTP_ERROR",
      "Sportmonks access denied for this endpoint or subscription.",
      { statusCode: status, details: bodyText.slice(0, 500) }
    );
  }

  if (status === 422) {
    return new SportmonksServiceError(
      "HTTP_ERROR",
      `Sportmonks rejected includes (HTTP 422). Active includes: [${includes.join(";") || "none"}].`,
      { statusCode: status, details: bodyText.slice(0, 800) }
    );
  }

  if (status === 429) {
    return new SportmonksServiceError(
      "RATE_LIMIT",
      "Sportmonks API rate limit exceeded.",
      { statusCode: status, details: bodyText.slice(0, 500) }
    );
  }

  return new SportmonksServiceError(
    "HTTP_ERROR",
    `Sportmonks API returned HTTP ${status}.`,
    { statusCode: status, details: bodyText.slice(0, 500) }
  );
}

async function requestInplay(
  token: string,
  includes: string[],
  timeoutMs: number
): Promise<FetchAttemptResult> {
  const startedAt = Date.now();
  const url = buildInplayUrl(token, includes);
  const endpointUrlRedacted = redactUrl(url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    const responseTimeMs = Date.now() - startedAt;
    const bodyText = await response.text();

    let body: SportmonksListResponse = {};
    try {
      body = JSON.parse(bodyText) as SportmonksListResponse;
    } catch {
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          body: {},
          bodyText,
          responseTimeMs,
          endpointUrlRedacted,
          includes,
        };
      }
      throw new SportmonksServiceError(
        "INVALID_PAYLOAD",
        "Sportmonks response is not valid JSON.",
        { statusCode: response.status, details: bodyText.slice(0, 300) }
      );
    }

    const result = {
      ok: response.ok,
      status: response.status,
      body,
      bodyText,
      responseTimeMs,
      endpointUrlRedacted,
      includes,
    };

    const rateLimit = parseRateLimit(body);
    recordApiUsageEvent({
      endpoint: INPLAY_PATH,
      method: "GET",
      success: response.ok,
      responseMs: responseTimeMs,
      httpStatus: response.status,
      rateLimitRemaining: rateLimit?.remaining,
      rateLimitResetsInSeconds: rateLimit?.resetsInSeconds,
      metadata: {
        includes: includes.join(";") || "(none)",
        dataCount: Array.isArray(body.data) ? body.data.length : 0,
      },
    });

    return result;
  } catch (error) {
    if (error instanceof SportmonksServiceError) throw error;

    const responseMs = Date.now() - startedAt;

    if (error instanceof Error && error.name === "AbortError") {
      recordApiUsageEvent({
        endpoint: INPLAY_PATH,
        method: "GET",
        success: false,
        responseMs,
        httpStatus: 408,
        metadata: { error: "timeout" },
      });
      throw new SportmonksServiceError(
        "TIMEOUT",
        `Sportmonks request timed out after ${timeoutMs}ms.`,
        { cause: error }
      );
    }

    recordApiUsageEvent({
      endpoint: INPLAY_PATH,
      method: "GET",
      success: false,
      responseMs,
      metadata: {
        error: error instanceof Error ? error.message : "network",
      },
    });

    throw new SportmonksServiceError(
      "NETWORK_ERROR",
      "Failed to reach Sportmonks API.",
      { cause: error }
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Probes tiers until one succeeds. Logs includes removed on 422.
 */
async function discoverIncludeProfile(
  token: string,
  timeoutMs: number
): Promise<{ profile: SportmonksIncludeProfile; attempt: FetchAttemptResult }> {
  logInfo("sportmonks", "Include discovery started", {
    endpoint: INPLAY_PATH,
    idealIncludes: [...IDEAL_INCLUDES],
    deprecatedIncludes: [...DEPRECATED_INCLUDES],
    tiers: INCLUDE_TIERS_DESCENDING.length,
  });

  const rejectedOn422: string[] = [];

  for (let tierIndex = 0; tierIndex < INCLUDE_TIERS_DESCENDING.length; tierIndex++) {
    const includes = [...INCLUDE_TIERS_DESCENDING[tierIndex]];
    const attempt = await requestInplay(token, includes, timeoutMs);

    logInfo("sportmonks", "Include tier probe", {
      tierIndex,
      httpStatus: attempt.status,
      activeIncludes: includes.length > 0 ? includes.join(";") : "(none)",
      endpoint: attempt.endpointUrlRedacted,
      message: attempt.body.message,
      dataCount: Array.isArray(attempt.body.data) ? attempt.body.data.length : 0,
    });

    if (isIncludeTierRejected(attempt.status, attempt.body, attempt.bodyText)) {
      const prevTier = INCLUDE_TIERS_DESCENDING[tierIndex - 1];
      if (prevTier) {
        const dropped = prevTier.filter((inc) => !includes.includes(inc));
        rejectedOn422.push(...dropped);
      }

      logWarn("sportmonks", "Include tier rejected — stepping down", {
        httpStatus: attempt.status,
        rejectedTier: includes.join(";") || "(none)",
        includesRemovedSoFar: [...new Set(rejectedOn422)],
        message: attempt.body.message,
        payloadSnippet: attempt.bodyText.slice(0, 400),
      });
      continue;
    }

    if (!attempt.ok) {
      throw mapHttpStatusToError(attempt.status, attempt.bodyText, includes);
    }

    const profile = buildIncludeProfile(includes, tierIndex);

    if (profile.minimalPayloadMode) {
      logWarn("sportmonks", MINIMAL_PAYLOAD_MODE, {
        activeIncludes: profile.activeIncludes,
        removedIncludes: profile.removedIncludes,
        note: "statistics and/or inplayOdds unavailable — mapper fallbacks will apply",
      });
    }

    logInfo("sportmonks", "Include discovery approved", {
      approvedTierIndex: tierIndex,
      activeIncludes: profile.activeIncludes.join(";") || "(none)",
      removedIncludes: profile.removedIncludes,
      minimalPayloadMode: profile.minimalPayloadMode,
      endpoint: attempt.endpointUrlRedacted,
    });

    return { profile, attempt };
  }

  throw new SportmonksServiceError(
    "HTTP_ERROR",
    "All include tiers rejected by Sportmonks (HTTP 422), including minimal payload.",
    { statusCode: 422, details: { rejectedOn422 } }
  );
}

async function fetchWithProfile(
  token: string,
  profile: SportmonksIncludeProfile,
  timeoutMs: number
): Promise<FetchAttemptResult> {
  const attempt = await requestInplay(token, profile.activeIncludes, timeoutMs);

  if (isIncludeTierRejected(attempt.status, attempt.body, attempt.bodyText)) {
    logWarn("sportmonks", "Cached includes rejected — invalidating profile", {
      httpStatus: attempt.status,
      activeIncludes: profile.activeIncludes,
    });
    resolvedIncludeProfile = null;
    throw mapHttpStatusToError(attempt.status, attempt.bodyText, profile.activeIncludes);
  }

  if (!attempt.ok) {
    throw mapHttpStatusToError(attempt.status, attempt.bodyText, profile.activeIncludes);
  }

  return attempt;
}

/**
 * Fetches in-play fixtures from Sportmonks with resilient include handling.
 */
export async function fetchInplayFixtures(): Promise<SportmonksInplayResult> {
  const token = getApiToken();
  const timeoutMs = getTimeoutMs();

  logInfo("sportmonks", "Fetching in-play fixtures", {
    endpoint: INPLAY_PATH,
    timeoutMs,
    cachedProfile: resolvedIncludeProfile !== null,
  });

  try {
    let profile = resolvedIncludeProfile;
    let attempt: FetchAttemptResult;

    if (!profile) {
      const discovered = await discoverIncludeProfile(token, timeoutMs);
      profile = discovered.profile;
      resolvedIncludeProfile = profile;
      attempt = discovered.attempt;
    } else {
      logInfo("sportmonks", "Using cached include profile", {
        activeIncludes: profile.activeIncludes.join(";") || "(none)",
        removedIncludes: profile.removedIncludes,
        minimalPayloadMode: profile.minimalPayloadMode,
      });

      try {
        attempt = await fetchWithProfile(token, profile, timeoutMs);
      } catch (retryError) {
        if (
          retryError instanceof SportmonksServiceError &&
          (retryError.statusCode === 422 || retryError.statusCode === 403)
        ) {
          logWarn("sportmonks", "Cached profile failed with 422 — rediscovering includes");
          const discovered = await discoverIncludeProfile(token, timeoutMs);
          profile = discovered.profile;
          resolvedIncludeProfile = profile;
          attempt = discovered.attempt;
        } else {
          throw retryError;
        }
      }
    }

    const rateLimit = parseRateLimit(attempt.body);

    if (rateLimit?.remaining === 0) {
      throw new SportmonksServiceError(
        "RATE_LIMIT",
        "Sportmonks API quota exhausted (remaining: 0).",
        { statusCode: 429, details: rateLimit }
      );
    }

    const fixtures = assertValidPayload(attempt.body);

    if (fixtures.length === 0) {
      logWarn("sportmonks", "Empty in-play fixture list", {
        responseTimeMs: attempt.responseTimeMs,
        message: attempt.body.message,
        activeIncludes: profile.activeIncludes,
      });
    } else {
      logInfo("sportmonks", "In-play fixtures fetched", {
        count: fixtures.length,
        responseTimeMs: attempt.responseTimeMs,
        rateLimit,
        httpStatus: attempt.status,
        activeIncludes: profile.activeIncludes.join(";") || "(none)",
        removedIncludes: profile.removedIncludes,
        minimalPayloadMode: profile.minimalPayloadMode,
        endpoint: attempt.endpointUrlRedacted,
        apiStatus: "ok",
      });
    }

    return {
      fixtures,
      responseTimeMs: attempt.responseTimeMs,
      rateLimit,
      includeProfile: profile,
      endpointUrlRedacted: attempt.endpointUrlRedacted,
    };
  } catch (error) {
    if (
      error instanceof SportmonksServiceError &&
      (error.statusCode === 422 || error.statusCode === 403)
    ) {
      resolvedIncludeProfile = null;
    }

    if (
      error instanceof SportmonksServiceError &&
      (error.statusCode === 422 || error.statusCode === 403) &&
      resolvedIncludeProfile === null
    ) {
      logError("sportmonks", "Include discovery failed", {
        hint: "Check plan includes: statistics, inplayOdds (not 'odds')",
      });
    }

    throw error;
  }
}

/** Clears cached include profile (for tests or forced rediscovery). */
export function resetSportmonksIncludeProfile(): void {
  resolvedIncludeProfile = null;
}
