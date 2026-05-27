/**
 * Detalhe de fixture SportMonks — terminal (jogos encerrados / agenda).
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import { mapSportmonksFixtureToMatch } from "@/lib/mappers/sportmonks";
import {
  getSportmonksApiToken,
  getSportmonksBaseUrl,
  isSportmonksTokenConfigured,
} from "@/lib/data-source/config";
import { SportmonksServiceError } from "@/lib/utils/sportmonksErrors";
import { logWarn } from "@/lib/utils/logger";
import type { Match } from "@/types/domain";

export const TERMINAL_FIXTURE_INCLUDES = [
  "participants",
  "scores",
  "league",
  "state",
  "statistics",
  "events",
  "timeline",
] as const;

function normalizeFixtureId(fixtureId: string): string {
  return fixtureId.replace(/^sm-/, "").trim();
}

export async function fetchSportmonksFixtureRaw(
  fixtureId: string
): Promise<SportmonksFixture | null> {
  const token = getSportmonksApiToken();
  if (!token) return null;

  const id = normalizeFixtureId(fixtureId);
  if (!/^\d+$/.test(id)) return null;

  const url = new URL(`${getSportmonksBaseUrl()}/fixtures/${id}`);
  url.searchParams.set("api_token", token);
  url.searchParams.set("include", TERMINAL_FIXTURE_INCLUDES.join(";"));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      throw new SportmonksServiceError(
        "HTTP_ERROR",
        `Sportmonks fixture ${id} HTTP ${res.status}`,
        { statusCode: res.status, details: text.slice(0, 400) }
      );
    }

    const body = JSON.parse(text) as { data?: SportmonksFixture };
    return body.data ?? null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchTerminalMatchByFixtureId(
  fixtureId: string
): Promise<{ match: Match; fixture: SportmonksFixture } | null> {
  if (!isSportmonksTokenConfigured()) return null;

  try {
    const fixture = await fetchSportmonksFixtureRaw(fixtureId);
    if (!fixture) return null;
    return { match: mapSportmonksFixtureToMatch(fixture), fixture };
  } catch (error) {
    logWarn("terminal-fixture", "fixture fetch failed", {
      fixtureId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
