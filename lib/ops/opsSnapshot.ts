import { signalDispatcher } from "@/lib/telegram/signalDispatcher";
import {
  getTelegramConfig,
  isTelegramConfigured,
} from "@/lib/telegram/telegramClient";
import { getTelegramHealthDetail } from "@/lib/telegram/telegramHealth";
import { getAverageDispatchLatencyMs } from "@/lib/telegram/telegramDispatchState";
import { getLiveRuntimeMetricsSnapshot } from "@/lib/runtime/liveRuntime";
import { getOpsStoreSnapshot } from "@/lib/ops/opsStore";
import type {
  OpsApiSuccessResponse,
  OpsLivePressureSnapshot,
  OpsTelegramStatus,
} from "@/types/opsApi";

async function buildTelegramStatus(): Promise<OpsTelegramStatus> {
  const health = await getTelegramHealthDetail();
  const config = getTelegramConfig();

  return {
    sandboxMode: health.sandbox,
    configured: isTelegramConfigured(),
    connected: health.connected,
    status: health.status,
    botTokenSet: Boolean(config.botToken),
    chatIdSet: Boolean(config.chatId),
    lastDispatch: health.lastDispatch,
    averageLatencyMs: health.averageLatencyMs,
    totalSent: health.totalSent,
    totalFailed: health.totalFailed,
  };
}

function buildLivePressureSnapshot(): OpsLivePressureSnapshot {
  const snap = getLiveRuntimeMetricsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      matchCount: 0,
      topPressure: null,
      metrics: [],
    };
  }

  const metrics = snap.metrics.map((m) => ({
    fixtureId: m.fixtureId,
    matchLabel: m.matchLabel,
    minute: m.minute,
    homePressure: m.homePressure,
    awayPressure: m.awayPressure,
    pressureScore: m.pressureScore,
    momentum: m.momentum,
    goalProbability: m.goalProbability,
    confidence: m.confidence,
  }));

  const top = snap.topPressure
    ? metrics.find((m) => m.fixtureId === snap.topPressure?.fixtureId) ?? metrics[0] ?? null
    : null;

  return {
    updatedAt: snap.updatedAt,
    matchCount: snap.matchCount,
    topPressure: top,
    metrics,
  };
}

export async function buildOpsApiPayload(
  responseTimeMs: number
): Promise<OpsApiSuccessResponse> {
  const [store, queueStats, telegram] = await Promise.all([
    getOpsStoreSnapshot(),
    Promise.resolve(signalDispatcher.getQueueStats()),
    buildTelegramStatus(),
  ]);

  const livePressure = buildLivePressureSnapshot();

  const counters = {
    ...store.counters,
    averageLatencyMs: getAverageDispatchLatencyMs(),
  };

  return {
    ok: true,
    telegram,
    queue: {
      queueSize: queueStats.pending,
      processing: queueStats.processing,
      cooldownEntries: queueStats.recentFingerprints,
    },
    counters,
    recentDispatches: store.recentDispatches,
    logs: store.logs,
    livePressure,
    meta: {
      fetchedAt: new Date().toISOString(),
      responseTimeMs,
      historyUpdatedAt: store.historyUpdatedAt,
    },
  };
}
