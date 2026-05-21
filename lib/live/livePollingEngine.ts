/**
 * Live ingestion polling engine — SportMonks via /api/live-matches, Supabase upsert,
 * analytics/research/ops feeds. Enterprise singleton on globalThis.__GP_RUNTIME__.
 */

import { getActiveModelId } from "@/lib/signalEngine";
import { fetchLiveMatchesDirect } from "@/lib/live/fetchLiveMatchesDirect";
import { syncLiveCycleArtifacts } from "@/lib/live/syncLiveCycleArtifacts";
import { persistLiveMatches } from "@/lib/live/liveMatchPersistence";
import { persistLiveSignals } from "@/lib/live/liveSignalPersistence";
import {
  scheduleExperimentalUpdate,
  scheduleLiveAnalyticsUpdate,
} from "@/lib/live/liveAnalyticsUpdater";
import { processLiveRuntimeMetrics } from "@/lib/runtime/liveRuntime";
import { processMarketCalibrationCycle } from "@/lib/market/marketCalibrationCycle";
import type { MarketEdgeCalibration } from "@/types/market";
import {
  processTemporalLiveCycle,
  processTemporalPreCycle,
} from "@/lib/temporal/temporalCycle";
import {
  processPlayerImpactLiveCycle,
  processPlayerImpactPreCycle,
} from "@/lib/player/playerImpactCycle";
import {
  processMicroeventLiveCycle,
  processMicroeventPreCycle,
} from "@/lib/microevent/microeventCycle";
import {
  processSequenceMemoryLiveCycle,
  processSequenceMemoryPreCycle,
} from "@/lib/sequence/sequenceCycle";
import {
  processMetaConsensusLiveCycle,
  processMetaConsensusPreCycle,
} from "@/lib/meta/metaCycle";
import { processRuntimeSignalCycle } from "@/lib/runtime/signalDispatcher";
import { recordRuntimeOpsLog } from "@/lib/ops/opsStore";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";
import type {
  LivePollingCycleStats,
  LivePollingEngineState,
} from "@/types/runtime";

const LOG_SCOPE = "live-polling-engine";

const DEFAULT_INTERVAL_MS = 15_000;
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
  private cycleDurationsMs: number[] = [];

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
      const modelId = getActiveModelId();
      const fetchResult = await this.fetchWithRetry(modelId);

      stats.matchesFetched = fetchResult.matches.length;

      await recordRuntimeOpsLog({
        event: "matches_fetched",
        message: `Partidas ao vivo: ${stats.matchesFetched}`,
        metadata: {
          count: stats.matchesFetched,
          cache: fetchResult.meta.cache,
          rateLimitRemaining: fetchResult.meta.rateLimitRemaining,
          sportmonksError: fetchResult.error,
        },
      });

      if (fetchResult.meta.rateLimitRemaining != null && fetchResult.meta.rateLimitRemaining < 50) {
        await recordRuntimeOpsLog({
          event: "rate_limit_warning",
          message: `SportMonks rate limit low: ${fetchResult.meta.rateLimitRemaining}`,
          level: "warn",
        });
      }

      if (fetchResult.error) {
        await recordRuntimeOpsLog({
          event: "sportmonks_degraded",
          message: `SportMonks degradado: ${fetchResult.error}`,
          level: "warn",
        });
      }

      const runtimeMetrics = await processLiveRuntimeMetrics(fetchResult.matches);
      const matches = runtimeMetrics.matches;

      try {
        processTemporalPreCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
      } catch (temporalPreErr) {
        logWarn(LOG_SCOPE, "Temporal pre-cycle skipped", {
          message:
            temporalPreErr instanceof Error
              ? temporalPreErr.message
              : "temporal_pre_failed",
        });
      }

      try {
        processPlayerImpactPreCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
      } catch (playerPreErr) {
        logWarn(LOG_SCOPE, "Player impact pre-cycle skipped", {
          message:
            playerPreErr instanceof Error
              ? playerPreErr.message
              : "player_pre_failed",
        });
      }

      try {
        processMicroeventPreCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
      } catch (microPreErr) {
        logWarn(LOG_SCOPE, "Microevent pre-cycle skipped", {
          message:
            microPreErr instanceof Error
              ? microPreErr.message
              : "microevent_pre_failed",
        });
      }

      try {
        processSequenceMemoryPreCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
      } catch (seqPreErr) {
        logWarn(LOG_SCOPE, "Sequence memory pre-cycle skipped", {
          message:
            seqPreErr instanceof Error
              ? seqPreErr.message
              : "sequence_pre_failed",
        });
      }

      try {
        processMetaConsensusPreCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
      } catch (metaPreErr) {
        logWarn(LOG_SCOPE, "Meta consensus pre-cycle skipped", {
          message:
            metaPreErr instanceof Error
              ? metaPreErr.message
              : "meta_pre_failed",
        });
      }

      const signalCycle = await processRuntimeSignalCycle({
        matches,
        metrics: runtimeMetrics.snapshot.metrics,
        modelId,
        dispatchTelegram: true,
      });

      const signals = [
        ...fetchResult.signals,
        ...signalCycle.signals.filter(
          (s) =>
            !fetchResult.signals.some(
              (existing) =>
                existing.matchId === s.matchId && existing.market === s.market
            )
        ),
      ];

      stats.metricsPersisted = runtimeMetrics.metricsPersisted;
      stats.decisionSignalsTriggered = signalCycle.triggered;
      stats.decisionSignalsDispatched = signalCycle.dispatched;

      let marketEdges: MarketEdgeCalibration[] = [];

      try {
        const marketCal = await processMarketCalibrationCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
          activeSignals: signalCycle.snapshot.activeSignals,
        });
        stats.marketEdgesCalibrated = marketCal.calibrated;
        marketEdges = marketCal.snapshot.edges;
      } catch (marketErr) {
        const msg =
          marketErr instanceof Error ? marketErr.message : "market_calibration_failed";
        logWarn(LOG_SCOPE, "Market calibration skipped", { message: msg });
      }

      try {
        const metaLive = await processMetaConsensusLiveCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
        stats.metaConsensusPersisted = metaLive.persisted;
      } catch (metaErr) {
        logWarn(LOG_SCOPE, "Meta consensus live cycle skipped", {
          message:
            metaErr instanceof Error
              ? metaErr.message
              : "meta_live_failed",
        });
      }

      try {
        const temporalLive = await processTemporalLiveCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
          marketEdges,
        });
        stats.temporalMetricsPersisted = temporalLive.persisted;
      } catch (temporalErr) {
        logWarn(LOG_SCOPE, "Temporal live cycle skipped", {
          message:
            temporalErr instanceof Error
              ? temporalErr.message
              : "temporal_live_failed",
        });
      }

      try {
        const playerLive = await processPlayerImpactLiveCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
        stats.playerMetricsPersisted = playerLive.persisted;
      } catch (playerErr) {
        logWarn(LOG_SCOPE, "Player impact live cycle skipped", {
          message:
            playerErr instanceof Error
              ? playerErr.message
              : "player_live_failed",
        });
      }

      try {
        const microLive = await processMicroeventLiveCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
        stats.microeventMetricsPersisted = microLive.persisted;
      } catch (microErr) {
        logWarn(LOG_SCOPE, "Microevent live cycle skipped", {
          message:
            microErr instanceof Error
              ? microErr.message
              : "microevent_live_failed",
        });
      }

      try {
        const seqLive = await processSequenceMemoryLiveCycle({
          matches,
          metrics: runtimeMetrics.snapshot.metrics,
        });
        stats.sequenceMemoryPersisted = seqLive.persisted;
      } catch (seqErr) {
        logWarn(LOG_SCOPE, "Sequence memory live cycle skipped", {
          message:
            seqErr instanceof Error
              ? seqErr.message
              : "sequence_live_failed",
        });
      }

      const matchResult = await persistLiveMatches(matches);
      stats.matchesUpserted = matchResult.upserted;

      stats.signalsGenerated = signals.length;

      await recordRuntimeOpsLog({
        event: "signals_generated",
        message: `Sinais gerados: ${stats.signalsGenerated}`,
        metadata: { modelId, count: stats.signalsGenerated },
      });

      const matchById = Object.fromEntries(matches.map((m) => [m.id, m]));

      const signalResult = await persistLiveSignals(signals, modelId, {
        matchById,
      });
      stats.signalsPersisted = signalResult.persisted;

      void syncLiveCycleArtifacts(matches, signals, fetchResult.meta);

      scheduleLiveAnalyticsUpdate();
      scheduleExperimentalUpdate(matches);

      stats.success = fetchResult.ok || stats.matchesFetched > 0;
      stats.durationMs = Date.now() - cycleStartedAt;
      this.cycleDurationsMs.push(stats.durationMs);
      if (this.cycleDurationsMs.length > 50) {
        this.cycleDurationsMs.shift();
      }

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

  getAverageCycleMs(): number {
    if (this.cycleDurationsMs.length === 0) return 0;
    const sum = this.cycleDurationsMs.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.cycleDurationsMs.length);
  }

  private async fetchWithRetry(modelId: string) {
    let attempt = 0;
    let lastResult: Awaited<ReturnType<typeof fetchLiveMatchesDirect>> | null =
      null;

    while (attempt < 3) {
      attempt += 1;
      const result = await fetchLiveMatchesDirect({
        modelId,
        useCache: attempt > 1,
        dispatchTelegram: false,
      });

      if (result.ok) return result;

      lastResult = result;

      await recordRuntimeOpsLog({
        event: "retry_attempt",
        message: `Retry ${attempt}/3: ${result.error ?? "fetch failed"}`,
        level: "warn",
        metadata: { attempt },
      });

      const delay = RETRY_BASE_MS * attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (lastResult) return lastResult;

    return fetchLiveMatchesDirect({
      modelId,
      useCache: false,
      dispatchTelegram: false,
    });
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
  if (process.env.GP_AUTO_START_RUNTIME === "false") return;
  if (typeof window !== "undefined") return;

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
