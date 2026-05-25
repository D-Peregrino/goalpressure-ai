import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireUser";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import { runOperationalValidation } from "@/lib/system/operationalValidation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/admin/run-validation — validação operacional (admin).
 */
export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Acesso negado." }, { status: 403 });
  }

  bootstrapGoalPressureRuntime();
  const report = await runOperationalValidation();
  return NextResponse.json(report);
}
