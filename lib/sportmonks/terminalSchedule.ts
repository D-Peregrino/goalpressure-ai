/**
 * Agenda do terminal — fixtures entre ontem e +3 dias (SportMonks).
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import { mapSportmonksFixturesToMatches } from "@/lib/mappers/sportmonks";
import {
  getSportmonksApiToken,
  getSportmonksBaseUrl,
  isSportmonksTokenConfigured,
} from "@/lib/data-source/config";
import { SportmonksServiceError } from "@/lib/utils/sportmonksErrors";
import { logWarn } from "@/lib/utils/logger";
import type { Match } from "@/types/domain";

import { TERMINAL_FIXTURE_INCLUDES } from "@/lib/sportmonks/fetchFixtureById";

const SCHEDULE_INCLUDES = [...TERMINAL_FIXTURE_INCLUDES];

function formatYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

async function fetchBetween(start: string, end: string): Promise<SportmonksFixture[]> {
  const token = getSportmonksApiToken();
  if (!token) return [];

  const url = new URL(`${getSportmonksBaseUrl()}/fixtures/between/${start}/${end}`);
  url.searchParams.set("api_token", token);
  url.searchParams.set("include", SCHEDULE_INCLUDES.join(";"));
  url.searchParams.set("per_page", "50");

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
        `Sportmonks schedule HTTP ${res.status}`,
        { statusCode: res.status, details: text.slice(0, 400) }
      );
    }

    const body = JSON.parse(text) as { data?: SportmonksFixture[] };
    return Array.isArray(body.data) ? body.data : [];
  } finally {
    clearTimeout(timeout);
  }
}

/** Pré-jogo e encerrados na janela curta do terminal. */
export async function fetchTerminalScheduleMatches(): Promise<Match[]> {
  if (!isSportmonksTokenConfigured()) return [];

  const today = new Date();
  const start = formatYmd(addDays(today, -1));
  const end = formatYmd(addDays(today, 3));

  try {
    const fixtures = await fetchBetween(start, end);
    return mapSportmonksFixturesToMatches(fixtures);
  } catch (error) {
    logWarn("terminal-schedule", "fixtures/between failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
