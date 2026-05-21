import { NextResponse } from "next/server";
import { getLiveMatchesCacheEntry } from "@/lib/cache/liveMatchesCache";
import { buildOpsApiPayload } from "@/lib/ops/opsSnapshot";
import { buildTacticalIntelligenceDebugReport } from "@/lib/tactical/tacticalIntelligenceDebugServer";
import type { TacticalIntelligenceDebugEntry } from "@/lib/tactical/tacticalMatchReader";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export interface TacticalIntelligenceDebugResponse {
  ok: boolean;
  timestamp: string;
  fixtureCount: number;
  fixtures: TacticalIntelligenceDebugEntry[];
  errorMessage?: string;
}

export async function GET(): Promise<NextResponse<TacticalIntelligenceDebugResponse>> {
  const timestamp = new Date().toISOString();

  try {
    const cache = getLiveMatchesCacheEntry();
    const matches = cache?.matches ?? [];
    const ops = await buildOpsApiPayload(0);
    const fixtures = buildTacticalIntelligenceDebugReport(matches, ops);

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
