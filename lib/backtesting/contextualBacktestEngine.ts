import { getBacktestConfig, isBacktestingEnabled } from "@/lib/backtesting/backtestConfig";
import { logBacktestEvent } from "@/lib/backtesting/backtestLogger";
import { runContextualBacktest } from "@/lib/backtesting/backtestRunner";
import {
  getContextualBacktestSnapshot,
  setContextualBacktestSnapshot,
} from "@/lib/backtesting/contextualBacktestSnapshotStore";
import type { ContextualBacktestSnapshot } from "@/lib/backtesting/backtest.types";

const CYCLE_INTERVAL_MS = 20 * 60 * 1000;
let lastRunAt = 0;
let running = false;

function emptySnapshot(): ContextualBacktestSnapshot {
  const config = getBacktestConfig();
  return {
    generatedAt: new Date().toISOString(),
    enabled: config.enabled,
    sandboxMode: config.sandbox,
    overallAccuracyPct: 0,
    validAnticipationRate: 0,
    falsePositiveRate: 0,
    avgMinutesBeforeGoal: 0,
    avgMarketDelayMinutes: 0,
    scenarios: [],
    topLeagues: [],
    topPatterns: [],
    topContexts: [],
    timeline: [],
    recentSimulations: [],
    calibrationNote:
      "Aguardando amostras históricas (outcomes e timelines locais). Métricas indicativas, não garantia de desempenho.",
  };
}

/**
 * Ciclo de backtesting contextual — não altera ContextEngine nem PredictiveEngine.
 */
export async function runContextualBacktestCycle(): Promise<ContextualBacktestSnapshot | null> {
  const config = getBacktestConfig();
  if (!config.enabled) return null;

  const now = Date.now();
  if (running) return getContextualBacktestSnapshot();
  if (now - lastRunAt < CYCLE_INTERVAL_MS && getContextualBacktestSnapshot()) {
    return getContextualBacktestSnapshot();
  }

  running = true;
  try {
    const { snapshot, pointsEvaluated } = await runContextualBacktest();
    setContextualBacktestSnapshot(snapshot);
    lastRunAt = now;

    if (pointsEvaluated === 0) {
      const fallback = emptySnapshot();
      setContextualBacktestSnapshot(fallback);
      return fallback;
    }

    return snapshot;
  } catch (err) {
    await logBacktestEvent({
      event: "backtest_error",
      message: err instanceof Error ? err.message : String(err),
    });
    return getContextualBacktestSnapshot();
  } finally {
    running = false;
  }
}

export function getContextualBacktestingSnapshot(): ContextualBacktestSnapshot {
  return getContextualBacktestSnapshot() ?? emptySnapshot();
}

export async function ensureContextualBacktestWarm(): Promise<ContextualBacktestSnapshot> {
  if (!isBacktestingEnabled()) {
    return emptySnapshot();
  }
  const existing = getContextualBacktestSnapshot();
  if (existing) return existing;
  const result = await runContextualBacktestCycle();
  return result ?? emptySnapshot();
}
