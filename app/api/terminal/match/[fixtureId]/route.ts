import { NextResponse } from "next/server";
import { fetchTerminalMatchByFixtureId } from "@/lib/sportmonks/fetchFixtureById";
import { resolveActiveDataSource } from "@/lib/data-source/config";
import { parseTerminalMatchTimeline } from "@/lib/terminal/parseTerminalMatchTimeline";
import {
  getSafeTerminalStats,
  logTerminalStatsAuditDev,
} from "@/lib/terminal/validatedStats";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ fixtureId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { fixtureId } = await context.params;
  const source = resolveActiveDataSource();

  if (source !== "sportmonks") {
    return NextResponse.json(
      { ok: false, error: "SPORTMONKS_API_TOKEN required" },
      { status: 503 }
    );
  }

  const result = await fetchTerminalMatchByFixtureId(fixtureId);
  if (!result) {
    return NextResponse.json(
      { ok: false, error: "Fixture not found or unavailable" },
      { status: 404 }
    );
  }

  const venue = result.fixture.venue;
  const venueLabel = venue?.name
    ? [venue.name, venue.city].filter(Boolean).join(" · ")
    : null;

  const timelineEvents = parseTerminalMatchTimeline({
    fixture: result.fixture,
    homeTeam: result.match.homeTeam,
    awayTeam: result.match.awayTeam,
  });

  logTerminalStatsAuditDev(result.fixture, fixtureId);
  const safeStats = getSafeTerminalStats({ fixture: result.fixture });

  return NextResponse.json(
    {
      ok: true,
      fixtureId: fixtureId.replace(/^sm-/, ""),
      match: result.match,
      validatedTeamStats: safeStats.teamStats,
      hasStatistics: safeStats.hasAny,
      hasEvents:
        Boolean(result.fixture.events?.length) ||
        Boolean(result.fixture.timeline?.length),
      standingsAvailable: Boolean(result.match.premium?.standingsAvailable),
      venue: venueLabel,
      eventsCount: result.fixture.events?.length ?? 0,
      timelineEvents,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
