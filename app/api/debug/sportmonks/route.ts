import { NextResponse } from "next/server";
import { fetchInplayFixtures } from "@/lib/services/sportmonks";
import {
  buildSportmonksDebugReport,
  type SportmonksDebugResponse,
} from "@/lib/services/sportmonksAudit";
import { isSportmonksServiceError } from "@/lib/utils/sportmonksErrors";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/debug/sportmonks
 * Institutional audit of SportMonks live integration.
 */
export async function GET(): Promise<NextResponse<SportmonksDebugResponse>> {
  let fetchError: string | null = null;

  try {
    const result = await fetchInplayFixtures();
    const report = await buildSportmonksDebugReport(result, null);
    return NextResponse.json(report, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    fetchError = isSportmonksServiceError(error)
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : "SportMonks audit fetch failed";

    const report = await buildSportmonksDebugReport(null, fetchError);
    return NextResponse.json(report, {
      status: report.ok ? 200 : 502,
      headers: { "Cache-Control": "no-store" },
    });
  }
}
