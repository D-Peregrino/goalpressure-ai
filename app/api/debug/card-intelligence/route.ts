import { NextResponse } from "next/server";
import { getLiveMatchesCacheEntry } from "@/lib/cache/liveMatchesCache";
import { buildOpsApiPayload } from "@/lib/ops/opsSnapshot";
import { buildCardIntelligenceDebugReport } from "@/lib/terminal/cardIntelligenceDebugServer";
import type { CardIntelligenceDebugEntry } from "@/lib/terminal/cardIntelligenceAudit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface CardIntelligenceDebugResponse {
  ok: boolean;
  timestamp: string;
  fixtureCount: number;
  fixtures: CardIntelligenceDebugEntry[];
  errorMessage?: string;
}

export async function GET(): Promise<NextResponse<CardIntelligenceDebugResponse>> {
  const timestamp = new Date().toISOString();

  try {
    const cache = getLiveMatchesCacheEntry();
    const matches = cache?.matches ?? [];
    const ops = await buildOpsApiPayload(0);

    const fixtures = buildCardIntelligenceDebugReport(matches, ops);

    return NextResponse.json({
      ok: true,
      timestamp,
      fixtureCount: fixtures.length,
      fixtures,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        ok: false,
        timestamp,
        fixtureCount: 0,
        fixtures: [],
        errorMessage: message,
      },
      { status: 500 }
    );
  }
}
