import { NextResponse } from "next/server";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import { getSystemHealthReport } from "@/lib/system/systemStatus";
import { runOperationalValidation } from "@/lib/system/operationalValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/system/health-report — relatório JSON consolidado (health + validação operacional).
 */
export async function GET() {
  bootstrapGoalPressureRuntime();

  const [health, operational] = await Promise.all([
    getSystemHealthReport(),
    runOperationalValidation(),
  ]);

  const report = {
    generatedAt: new Date().toISOString(),
    status: operational.ok && health.status !== "unhealthy" ? health.status : "degraded",
    health,
    operational,
    summary: {
      dataSource: operational.activeDataSource,
      liveMatchesInPlay: operational.sportmonks.inPlayCount,
      supabaseConnected: operational.supabase.connected,
      runtimeActive: operational.runtime.active,
      engineTablesOk: operational.tables.filter((t) => t.reachable).length,
      engineTablesTotal: operational.tables.length,
      pendingErrorCount: operational.pendingErrors.length,
      checksPassing: operational.checks.filter((c) => c.status === "ok").length,
      checksTotal: operational.checks.length,
    },
  };

  return NextResponse.json(report, {
    headers: { "Cache-Control": "no-store" },
  });
}
