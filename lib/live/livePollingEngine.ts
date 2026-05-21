/**
 * Live ingestion polling engine — SportMonks via /api/live-matches, Supabase upsert,
 * analytics/research/ops feeds. Enterprise singleton on globalThis.__GP_RUNTIME__.
 */

import { evaluateAllGames } from "@/lib/signalEngine";
import { getActiveModelId } from "@/lib/signalEngine";
import { fetchLiveMatchesFromApi } from "@/lib/live/liveMatchesClient";
import { persistLiveMatches } from "@/lib/live/liveMatchPersistence";
import { persistLiveSignals } from "@/lib/live/liveSignalPersistence";
import {
  scheduleExperimentalUpdate,
  scheduleLiveAnalyticsUpdate,
} from "@/lib/live/liveAnalyticsUpdater";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";
import type {
  LivePollingCycleStats,
  LivePollingEngineState,
} from "@/types/runtime";

const LOG_SCOPE = "live-polling-engine";

const DEFAULT_INTERVAL_MS = 20_000;
const MAX_CONSECUTIVE_FAILURES = 5;
const RETRY_BASE_MS = 2_000;

export interface LivePollingOptions {
  intervalMs?: number;
  baseUrl?: string;
  autoStart?: boolean;
}

interface GlobalRuntimeSlot {
  engine: LivePollingEngine | null;
  lock: boolean;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_RUNTIME__: GlobalRuntimeSlot | undefined;
}

function getRuntimeSlot(): GlobalRuntimeSlot {
  if (!globalThis.__GP_RUNTIME__) {
    globalThis.__GP_RUNTIME__ = { engine: null, lock: false };
  }
  return globalThis.__GP_RUNTIME__;
}

function createInitialState(intervalMs: number): LivePollingEngineState {
  return {
    running: false,
    intervalMs,
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
}

export class LivePollingEngine {
  private readonly intervalMs: number;
  private readonly baseUrl?: string;
  private state: LivePollingEngineState;
  private timer: ReturnType<typeof setInterval> | null = null;
  private cycleAbort: AbortController | null = null;
  private cycleInFlight = false;
  private readonly startedAtMs = Date.now();

  constructor(options: LivePollingOptions = {}) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.baseUrl = options.baseUrl;
    this.state = createInitialState(this.intervalMs);
  }

  getState(): LivePollingEngineState {
    return { ...this.state, lastCycle: this.state.lastCycle ? { ...this.state.lastCycle } : null };
  }

  getUptimeSec(): number {
    return Math.floor((Date.now() - this.startedAtMs) / 1000);
  }

  isRunning(): boolean {
    return this.state.running;
  }

  start(): void {
    if (this.state.running) return;

    this.state.running = true;
    this.state.startedAt = new Date().toISOString();

    logOps(LOG_SCOPE, "Live polling started", {
      intervalMs: this.intervalMs,
    });

    void recordRuntimeOpsLog({
      event: "polling_started",
      message: `Live polling started (${this.intervalMs}ms interval)`,
      metadata: { intervalMs: this.intervalMs },
    });

    void this.runLivePollingCycle();

    this.timer = setInterval(() => {
      void this.runLivePollingCycle();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.state.running) return;

    this.state.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.cycleAbort?.abort();
    this.cycleAbort = null;

    logOps(LOG_SCOPE, "Live polling stopped", {
      totalCycles: this.state.totalCycles,
    });

    void recordRuntimeOpsLog({
      event: "runtime_stopped",
      message: "Live polling engine stopped",
    });
  }

  async runLivePollingCycle(): Promise<LivePollingCycleStats> {
    if (this.cycleInFlight) {
      return {
        matchesFetched: 0,
        matchesUpserted: 0,
        signalsGenerated: 0,
        signalsPersisted: 0,
        durationMs: 0,
        success: false,
        warning: "cycle_already_in_flight",
      };
    }

    this.cycleInFlight = true;
    const cycleStartedAt = Date.now();
    this.state.lastPollAt = new Date().toISOString();
    this.state.totalCycles += 1;

    this.cycleAbort = new AbortController();

    const stats: LivePollingCycleStats = {
      matchesFetched: 0,
      matchesUpserted: 0,
      signalsGenerated: 0,
      signalsPersisted: 0,
      durationMs: 0,
      success: false,
    };

    try {
      const payload = await this.fetchWithRetry(this.cycleAbort.signal);
      stats.matchesFetched = payload.matches.length;

      await recordRuntimeOpsLog({
        event: "matches_fetched",
        message: `Matches fetched: ${stats.matchesFetched}`,
        metadata: {
          count: stats.matchesFetched,
          cache: payload.meta.cache,
          rateLimitRemaining: payload.meta.rateLimitRemaining,
        },
      });

      if (payload.meta.rateLimitRemaining != null && payload.meta.rateLimitRemaining < 50) {
        await recordRuntimeOpsLog({
          event: "rate_limit_warning",
          message: `SportMonks rate limit low: ${payload.meta.rateLimitRemaining}`,
          level: "warn",
        });
      }

      const matchResult = await persistLiveMatches(payload.matches);
      stats.matchesUpserted = matchResult.upserted;

      const modelId = getActiveModelId();
      const signals = evaluateAllGames(payload.matches);
      stats.signalsGenerated = signals.length;

      await recordRuntimeOpsLog({
        event: "signals_generated",
        message: `Signals generated: ${stats.signalsGenerated}`,
        metadata: { modelId, count: stats.signalsGenerated },
      });

      const minuteByMatchId = Object.fromEntries(
        payload.matches.map((m) => [m.id, m.minute])
      );

      const signalResult = await persistLiveSignals(signals, modelId, {
        minuteByMatchId,
      });
      stats.signalsPersisted = signalResult.persisted;

      scheduleLiveAnalyticsUpdate();
      scheduleExperimentalUpdate(payload.matches);

      stats.success = true;
      stats.durationMs = Date.now() - cycleStartedAt;

      this.state.lastSuccessAt = new Date().toISOString();
      this.state.lastError = null;
      this.state.consecutiveFailures = 0;
      this.state.totalMatchesProcessed += stats.matchesFetched;
      this.state.totalSignalsGenerated += stats.signalsGenerated;

      await recordRuntimeOpsLog({
        event: "polling_completed",
        message: `Polling cycle OK (${stats.durationMs}ms)`,
        metadata: { ...stats },
      });

      logInfo(LOG_SCOPE, "Polling cycle completed", { ...stats });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      stats.error = message;
      stats.durationMs = Date.now() - cycleStartedAt;
      this.state.lastError = message;
      this.state.consecutiveFailures += 1;

      await recordRuntimeOpsLog({
        event: "polling_failed",
        message: `Polling cycle failed: ${message}`,
        level: "error",
        metadata: { consecutiveFailures: this.state.consecutiveFailures },
      });

      logWarn(LOG_SCOPE, "Polling cycle failed", {
        message,
        consecutiveFailures: this.state.consecutiveFailures,
      });

      if (this.state.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        logWarn(LOG_SCOPE, "Max consecutive failures — polling continues with backoff", {
          max: MAX_CONSECUTIVE_FAILURES,
        });
      }
    } finally {
      this.state.lastCycle = { ...stats };
      this.cycleInFlight = false;
      this.cycleAbort = null;
    }

    return stats;
  }

  private async fetchWithRetry(signal: AbortSignal) {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < 3) {
      attempt += 1;
      try {
        return await fetchLiveMatchesFromApi({
          baseUrl: this.baseUrl,
          signal,
        });
      } catch (error) {
        lastError = error instanceof Error ? error : new Error("Unknown error");

        if (signal.aborted) throw lastError;

        await recordRuntimeOpsLog({
          event: "retry_attempt",
          message: `Retry ${attempt}/3: ${lastError.message}`,
          level: "warn",
          metadata: { attempt },
        });

        const delay = RETRY_BASE_MS * attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError ?? new Error("Live matches fetch failed");
  }
}

export function getLivePollingEngine(): LivePollingEngine | null {
  return getRuntimeSlot().engine;
}

export function startLivePolling(options?: LivePollingOptions): LivePollingEngine {
  const slot = getRuntimeSlot();

  if (slot.engine?.isRunning()) {
    return slot.engine;
  }

  if (!slot.engine) {
    slot.engine = new LivePollingEngine(options);
  }

  slot.engine.start();

  void recordRuntimeOpsLog({
    event: "runtime_started",
    message: "GoalPressure live runtime started",
    metadata: { intervalMs: slot.engine.getState().intervalMs },
  });

  return slot.engine;
}

export function stopLivePolling(): void {
  const slot = getRuntimeSlot();
  slot.engine?.stop();
}

/**
 * Production auto-start — single instance per Node process.
 */
export function ensureProductionRuntimeStarted(): void {
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.GP_AUTO_START_RUNTIME === "false") return;

  const slot = getRuntimeSlot();
  if (slot.lock || slot.engine?.isRunning()) return;

  slot.lock = true;

  try {
    startLivePolling({
      intervalMs: Number(process.env.GP_POLLING_INTERVAL_MS) || DEFAULT_INTERVAL_MS,
    });
  } finally {
    slot.lock = false;
  }
}
