import { NextResponse } from "next/server";
import {
  getLivePollingEngine,
  stopLivePolling,
} from "@/lib/live/livePollingEngine";
import { logOps } from "@/lib/utils/logger";
import type { RuntimeControlResponse } from "@/types/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse<RuntimeControlResponse>> {
  stopLivePolling();
  const engine = getLivePollingEngine();
  const state = engine?.getState() ?? {
    running: false,
    intervalMs: 20_000,
    startedAt: null,
    lastPollAt: null,
    lastSuccessAt: null,
    lastError: null,
    consecutiveFailures: 0,
    totalCycles: 0,
    totalMatchesProcessed: 0,
    totalSignalsGenerated: 0,
    lastCycle: null,
  };

  logOps("api/runtime/stop", "Runtime stop requested");

  return NextResponse.json({
    ok: true,
    action: "stop",
    message: "Live polling engine stopped",
    state,
  });
}
