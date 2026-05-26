import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import {
  COPA_INCLUDES,
  COPA_LEAGUE_ID,
  COPA_WINDOW,
} from "@/lib/copa/config";
import {
  getSportmonksApiToken,
  getSportmonksBaseUrl,
  isSportmonksTokenConfigured,
} from "@/lib/data-source/config";
import { fetchInplayFixtures } from "@/lib/services/sportmonks";
import { SportmonksServiceError } from "@/lib/utils/sportmonksErrors";
import { logWarn } from "@/lib/utils/logger";

interface ListResponse {
  data?: SportmonksFixture[];
  message?: string;
}

function leagueFilterParam(): string {
  return `fixtureLeagues:${COPA_LEAGUE_ID}`;
}

function isCopaFixture(f: SportmonksFixture): boolean {
  if (f.league_id === COPA_LEAGUE_ID) return true;
  const leagueName = (f.league?.name ?? "").toLowerCase();
  return (
    leagueName.includes("world cup") ||
    leagueName.includes("copa do mundo") ||
    leagueName.includes("fifa")
  );
}

async function fetchSportmonksList(path: string): Promise<SportmonksFixture[]> {
  const token = getSportmonksApiToken();
  if (!token) return [];

  const url = new URL(`${getSportmonksBaseUrl()}${path}`);
  url.searchParams.set("api_token", token);
  url.searchParams.set("include", COPA_INCLUDES.join(";"));
  url.searchParams.set("filters", leagueFilterParam());
  url.searchParams.set("per_page", "50");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: controller.signal,
      cache: "no-store",
      next: { revalidate: 0 },
    });

    const text = await res.text();
    if (!res.ok) {
      throw new SportmonksServiceError(
        "HTTP_ERROR",
        `Sportmonks Copa fixtures HTTP ${res.status}`,
        { statusCode: res.status, details: text.slice(0, 400) }
      );
    }

    const body = JSON.parse(text) as ListResponse;
    if (!Array.isArray(body.data)) return [];
    return body.data.filter(isCopaFixture);
  } finally {
    clearTimeout(timeout);
  }
}

/** Fixtures na janela da Copa (between). */
export async function fetchCopaFixturesWindow(
  start = COPA_WINDOW.start,
  end = COPA_WINDOW.end
): Promise<SportmonksFixture[]> {
  if (!isSportmonksTokenConfigured()) return [];
  try {
    return await fetchSportmonksList(`/fixtures/between/${start}/${end}`);
  } catch (error) {
    logWarn("copa", "fixtures/between failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Jogos ao vivo filtrados para a liga da Copa. */
export async function fetchCopaInplayFixtures(): Promise<SportmonksFixture[]> {
  if (!isSportmonksTokenConfigured()) return [];
  try {
    const { fixtures } = await fetchInplayFixtures();
    return fixtures.filter(isCopaFixture);
  } catch (error) {
    logWarn("copa", "inplay fetch failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

/** Fixtures de uma data (YYYY-MM-DD). */
export async function fetchCopaFixturesByDate(date: string): Promise<SportmonksFixture[]> {
  if (!isSportmonksTokenConfigured()) return [];
  try {
    return await fetchSportmonksList(`/fixtures/date/${date}`);
  } catch {
    return [];
  }
}

export function mergeCopaFixtures(
  ...lists: SportmonksFixture[][]
): SportmonksFixture[] {
  const byId = new Map<number, SportmonksFixture>();
  for (const list of lists) {
    for (const f of list) {
      if (typeof f.id === "number") byId.set(f.id, f);
    }
  }
  return [...byId.values()].sort((a, b) => {
    const ta = a.starting_at_timestamp ?? 0;
    const tb = b.starting_at_timestamp ?? 0;
    return ta - tb;
  });
}
