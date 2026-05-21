import { NextResponse } from "next/server";
import { startLivePolling } from "@/lib/live/livePollingEngine";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import { logOps } from "@/lib/utils/logger";
import type { RuntimeControlResponse } from "@/types/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse<RuntimeControlResponse>> {
  bootstrapGoalPressureRuntime();
  const engine = startLivePolling({
    intervalMs: Number(process.env.GP_POLLING_INTERVAL_MS) || 20_000,
  });

  const state = engine.getState();

  logOps("api/runtime/start", "Runtime start requested", {
    running: state.running,
  });

  return NextResponse.json({
    ok: true,
    action: "start",
    message: "Live polling engine started",
    state,
  });
}
