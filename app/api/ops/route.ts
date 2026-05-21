import { NextResponse } from "next/server";
import { buildOpsApiPayload } from "@/lib/ops/opsSnapshot";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { OpsApiResponse } from "@/types/opsApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/ops";

export async function GET(): Promise<NextResponse<OpsApiResponse>> {
  const startedAt = Date.now();

  try {
    const body = await buildOpsApiPayload(Date.now() - startedAt);

    logInfo(ROUTE_SCOPE, "Ops snapshot served", {
      queueSize: body.queue.queueSize,
      sandbox: body.telegram.sandboxMode,
      dispatches: body.recentDispatches.length,
      logs: body.logs.length,
    });

    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(ROUTE_SCOPE, "Ops snapshot failed", { message });

    return NextResponse.json(
      { ok: false, error: { message } },
      { status: 500 }
    );
  }
}
