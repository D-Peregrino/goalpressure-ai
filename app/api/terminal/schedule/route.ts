import { NextResponse } from "next/server";
import { resolveActiveDataSource } from "@/lib/data-source/config";
import { fetchTerminalScheduleMatches } from "@/lib/sportmonks/terminalSchedule";
import {
  isFinishedStatus,
  isPreMatchStatus,
  toDisplayStatus,
} from "@/lib/ui/matchFormatting";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const source = resolveActiveDataSource();
  if (source !== "sportmonks") {
    return NextResponse.json(
      {
        ok: false,
        matches: [],
        error: "SPORTMONKS_API_TOKEN required for terminal schedule",
        meta: { source },
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const matches = await fetchTerminalScheduleMatches();
  const upcoming = matches.filter((m) =>
    isPreMatchStatus(m.status, toDisplayStatus(m.status))
  );
  const finished = matches.filter((m) =>
    isFinishedStatus(m.status, toDisplayStatus(m.status))
  );

  return NextResponse.json(
    {
      ok: true,
      matches,
      meta: {
        source: "sportmonks",
        total: matches.length,
        upcoming: upcoming.length,
        finished: finished.length,
        fetchedAt: Date.now(),
      },
    },
    { headers: { "Cache-Control": "no-store, max-age=60" } }
  );
}
