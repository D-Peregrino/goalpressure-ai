export interface LivePollingCycleStats {
  matchesFetched: number;
  matchesUpserted: number;
  signalsGenerated: number;
  signalsPersisted: number;
  durationMs: number;
  success: boolean;
  error?: string;
  warning?: string;
}

export interface LivePollingEngineState {
  running: boolean;
  intervalMs: number;
  startedAt: string | null;
  lastPollAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  totalCycles: number;
  totalMatchesProcessed: number;
  totalSignalsGenerated: number;
  lastCycle: LivePollingCycleStats | null;
}

export interface RuntimeStatusResponse {
  running: boolean;
  lastPolling: string | null;
  lastSuccess: string | null;
  lastCycle: LivePollingCycleStats | null;
  matchesProcessed: number;
  signalsGenerated: number;
  matchesInLastCycle: number;
  signalsInLastCycle: number;
  averageCycleMs: number;
  uptime: number;
  memoryUsage: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
  };
  state: LivePollingEngineState;
}

export interface RuntimeControlResponse {
  ok: boolean;
  action: "start" | "stop" | "status";
  message: string;
  state: LivePollingEngineState;
}
