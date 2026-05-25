import { NextResponse } from "next/server";
import { runSportmonksDiagnostic } from "@/lib/sportmonks/client";

export const dynamic = "force-dynamic";

/** GET /api/sportmonks/diagnostic — testa token, endpoint e payload in-play. */
export async function GET() {
  const result = await runSportmonksDiagnostic();
  return NextResponse.json(result, {
    headers: { "Cache-Control": "no-store" },
  });
}
