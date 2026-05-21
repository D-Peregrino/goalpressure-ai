import { NextResponse } from "next/server";
import { getLivePollingEngine } from "@/lib/live/livePollingEngine";
import { bootstrapGoalPressureRuntime } from "@/lib/runtime/runtimeBootstrap";
import type { RuntimeStatusResponse } from "@/types/runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(): Promise<NextResponse<RuntimeStatusResponse>> {
  bootstrapGoalPressureRuntime();

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

  const mem = process.memoryUsage();

  const lastCycle = state.lastCycle;

  const body: RuntimeStatusResponse = {
    running: state.running,
    lastPolling: state.lastPollAt,
    lastSuccess: state.lastSuccessAt,
    lastCycle,
    matchesProcessed: state.totalMatchesProcessed,
    signalsGenerated: state.totalSignalsGenerated,
    matchesInLastCycle: lastCycle?.matchesFetched ?? 0,
    signalsInLastCycle: lastCycle?.signalsGenerated ?? 0,
    averageCycleMs: engine?.getAverageCycleMs() ?? lastCycle?.durationMs ?? 0,
    uptime: engine?.getUptimeSec() ?? 0,
    memoryUsage: {
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
    },
    state,
  };

  return NextResponse.json(body);
}
