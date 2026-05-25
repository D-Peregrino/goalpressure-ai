import { NextResponse } from "next/server";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import { runOperationalValidation } from "@/lib/system/operationalValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/system/validation — validação operacional ponta a ponta.
 */
export async function GET() {
  bootstrapGoalPressureRuntime();
  const report = await runOperationalValidation();
  return NextResponse.json(report, {
      status: report.ok ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
