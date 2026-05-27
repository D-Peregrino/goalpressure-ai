import { NextResponse } from "next/server";
import { fetchTerminalMatchByFixtureId } from "@/lib/sportmonks/fetchFixtureById";
import { resolveActiveDataSource } from "@/lib/data-source/config";

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

  return NextResponse.json(
    {
      ok: true,
      fixtureId: fixtureId.replace(/^sm-/, ""),
      match: result.match,
      hasStatistics: Boolean(result.match.teamStats),
      hasEvents: Boolean(result.fixture.events?.length),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
