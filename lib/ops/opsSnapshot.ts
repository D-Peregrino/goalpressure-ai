import { signalDispatcher } from "@/lib/telegram/signalDispatcher";
import {
  getTelegramConfig,
  isTelegramConfigured,
} from "@/lib/telegram/telegramClient";
import { getTelegramHealthDetail } from "@/lib/telegram/telegramHealth";
import { getAverageDispatchLatencyMs } from "@/lib/telegram/telegramDispatchState";
import { getLiveRuntimeMetricsSnapshot } from "@/lib/runtime/liveRuntime";
import { getBacktestOpsSnapshot } from "@/lib/backtest/backtestSnapshot";
import { getMarketCalibrationOpsSnapshot } from "@/lib/market/marketSnapshot";
import { getTemporalOpsSnapshot } from "@/lib/temporal/temporalSnapshot";
import { getPlayerOpsSnapshot } from "@/lib/player/playerSnapshot";
import { getMicroeventOpsSnapshot } from "@/lib/microevent/microeventSnapshot";
import { getSequenceOpsSnapshot } from "@/lib/sequence/sequenceSnapshot";
import { getMetaOpsSnapshot } from "@/lib/meta/metaSnapshot";
import { getDataQualityOpsSnapshot } from "@/lib/dataQuality/dataQualitySnapshot";
import { getAutoDispatchStatus } from "@/lib/telegram/autoDispatchController";
import { getValidationOpsSnapshot } from "@/lib/validation/validationSnapshot";
import { getApiUsageSnapshot } from "@/lib/api/apiUsageMonitor";
import { getRuntimeSignalOpsSnapshot } from "@/lib/runtime/signalDispatcher";
import { getOpsStoreSnapshot } from "@/lib/ops/opsStore";
import type {
  OpsApiSuccessResponse,
  OpsLivePressureSnapshot,
  OpsBacktestSnapshot,
  OpsMarketCalibrationSnapshot,
  OpsTemporalSnapshot,
  OpsPlayerImpactSnapshot,
  OpsMicroeventSnapshot,
  OpsSequenceMemorySnapshot,
  OpsMetaConsensusSnapshot,
  OpsDataQualitySnapshot,
  OpsAutoDispatchSnapshot,
  OpsValidationSnapshot,
  OpsApiUsageSnapshot,
  OpsSignalDecisionSnapshot,
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

function buildSignalDecisionSnapshot(): OpsSignalDecisionSnapshot {
  const snap = getRuntimeSignalOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      evaluated: 0,
      triggered: 0,
      dispatched: 0,
      blocked: 0,
      averageEv: 0,
      approvalRate: 0,
      activeSignals: [],
    };
  }

  return {
    updatedAt: snap.updatedAt,
    evaluated: snap.evaluated,
    triggered: snap.triggered,
    dispatched: snap.dispatched,
    blocked: snap.blocked,
    averageEv: snap.averageEv,
    approvalRate: snap.approvalRate,
    activeSignals: snap.activeSignals.map((s) => ({
      fixtureId: s.fixtureId,
      matchLabel: s.matchLabel,
      minute: s.minute,
      market: s.market,
      pressureScore: s.pressureScore,
      momentum: s.momentum,
      ev: s.ev,
      confidence: s.confidence,
      urgency: s.urgency,
    })),
  };
}

function buildBacktestSnapshot(): OpsBacktestSnapshot {
  const snap = getBacktestOpsSnapshot();
  if (!snap?.lastRun) {
    return {
      updatedAt: null,
      roi: 0,
      hitRate: 0,
      averageEv: 0,
      profitUnits: 0,
      maxDrawdown: 0,
      winStreak: 0,
      loseStreak: 0,
      totalSignals: 0,
      wins: 0,
      losses: 0,
      sharpeLikeRatio: 0,
    };
  }

  const r = snap.lastRun;
  return {
    updatedAt: snap.updatedAt,
    roi: snap.roi,
    hitRate: snap.hitRate,
    averageEv: snap.averageEv,
    profitUnits: snap.profitUnits,
    maxDrawdown: snap.maxDrawdown,
    winStreak: snap.winStreak,
    loseStreak: snap.loseStreak,
    totalSignals: r.totalSignals,
    wins: r.wins,
    losses: r.losses,
    sharpeLikeRatio: r.sharpeLikeRatio,
  };
}

function buildMarketCalibrationSnapshot(): OpsMarketCalibrationSnapshot {
  const snap = getMarketCalibrationOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      calibrated: 0,
      averageEdge: 0,
      strongestEdgeFixture: null,
      strongestEdgePercent: 0,
      closingLineEfficiency: 0,
      marketDrift: 0,
      sharpPressure: 0,
      steamMoves: 0,
      topEdges: [],
    };
  }

  return {
    updatedAt: snap.updatedAt,
    calibrated: snap.calibrated,
    averageEdge: snap.averageEdge,
    strongestEdgeFixture: snap.strongestEdge?.fixtureId ?? null,
    strongestEdgePercent: snap.strongestEdge?.edgePercent ?? 0,
    closingLineEfficiency: snap.closingLineEfficiency,
    marketDrift: snap.marketDrift,
    sharpPressure: snap.sharpPressure,
    steamMoves: snap.steamMoves,
    topEdges: snap.edges.slice(0, 8).map((e) => ({
      fixtureId: e.fixtureId,
      matchLabel: e.matchLabel,
      market: e.market,
      marketOdd: e.marketOdd,
      fairOdd: e.fairOdd,
      edgePercent: e.edgePercent,
      classification: e.classification,
      expectedValue: e.expectedValue,
      steamMove: e.steamMove,
      oddsDrift: e.oddsDrift,
    })),
  };
}

function buildDataQualitySnapshot(): OpsDataQualitySnapshot {
  const snap = getDataQualityOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      matchCount: 0,
      averageScore: 0,
      unreliableCount: 0,
      staleAlerts: [],
      notUsableForSignal: [],
    };
  }
  return {
    updatedAt: snap.updatedAt,
    matchCount: snap.matchCount,
    averageScore: snap.averageScore,
    unreliableCount: snap.unreliableCount,
    staleAlerts: snap.staleAlerts,
    notUsableForSignal: snap.notUsableForSignal,
  };
}

function buildAutoDispatchSnapshot(): OpsAutoDispatchSnapshot {
  return getAutoDispatchStatus();
}

function buildApiUsageSnapshot(): OpsApiUsageSnapshot {
  const snap = getApiUsageSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      alertLevel: "SAFE",
      requestsPerMinute: 0,
      requestsPerHour: 0,
      requestsPerDay: 0,
      requestsMonthProjection: 0,
      estimatedRemainingQuota: null,
      monthlyQuota: 3000,
      quotaUtilizationPercent: 0,
      averagePollingFrequencyMs: 15000,
      activeFixtures: 0,
      planSupportDays: null,
      planSupportHours: null,
      topEndpoints: [],
      requestHeatmap: [],
      cacheHitRate: 0,
    };
  }
  return {
    updatedAt: snap.updatedAt,
    alertLevel: snap.alertLevel,
    requestsPerMinute: snap.requestsPerMinute,
    requestsPerHour: snap.requestsPerHour,
    requestsPerDay: snap.requestsPerDay,
    requestsMonthProjection: snap.requestsMonthProjection,
    estimatedRemainingQuota: snap.estimatedRemainingQuota,
    monthlyQuota: snap.monthlyQuota,
    quotaUtilizationPercent: snap.quotaUtilizationPercent,
    averagePollingFrequencyMs: snap.averagePollingFrequencyMs,
    activeFixtures: snap.activeFixtures,
    planSupportDays: snap.planSupportDays,
    planSupportHours: snap.planSupportHours,
    topEndpoints: snap.topEndpoints
      .filter((e) => !e.endpoint.startsWith("/internal/"))
      .map((e) => ({
        endpoint: e.endpoint,
        count: e.count,
        sharePercent: e.sharePercent,
      })),
    requestHeatmap: snap.requestHeatmap,
    cacheHitRate: snap.cacheHitRate,
  };
}

function buildValidationSnapshot(): OpsValidationSnapshot {
  const snap = getValidationOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      matchCount: 0,
      averageValidationScore: 0,
      tradeCount: 0,
      hitRate: 0,
      roi: 0,
      suggestionCount: 0,
      flaggedCount: 0,
      topSuggestions: [],
    };
  }
  return {
    updatedAt: snap.updatedAt,
    matchCount: snap.matchCount,
    averageValidationScore: snap.averageValidationScore,
    tradeCount: snap.lab.tradeCount,
    hitRate: snap.lab.hitRate,
    roi: snap.lab.roi,
    suggestionCount: snap.lab.calibrationSuggestions.length,
    flaggedCount: snap.flaggedCount,
    topSuggestions: snap.lab.calibrationSuggestions.slice(0, 5).map((s) => ({
      title: s.title,
      priority: s.priority,
      action: s.action,
    })),
  };
}

function buildMetaConsensusSnapshot(): OpsMetaConsensusSnapshot {
  const snap = getMetaOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      matchCount: 0,
      averageConsensusScore: 0,
      averageInstitutionalConfidence: 0,
      executionGrades: [],
      consensusHeatmap: [],
      falsePositiveAlerts: [],
      dominantEnginesSummary: [],
      topExecutions: [],
    };
  }

  return {
    updatedAt: snap.updatedAt,
    matchCount: snap.matchCount,
    averageConsensusScore: snap.averageConsensusScore,
    averageInstitutionalConfidence: snap.averageInstitutionalConfidence,
    executionGrades: snap.executionGrades,
    consensusHeatmap: snap.consensusHeatmap,
    falsePositiveAlerts: snap.falsePositiveAlerts,
    dominantEnginesSummary: snap.dominantEnginesSummary,
    topExecutions: snap.topExecutions,
  };
}

function buildSequenceMemorySnapshot(): OpsSequenceMemorySnapshot {
  const snap = getSequenceOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      matchCount: 0,
      averageRecurrenceScore: 0,
      recurrenceLeaders: [],
      offensiveCycles: [],
      fakeMomentumAlerts: [],
      collapseCycles: [],
      dominanceCurves: [],
      sustainedChaos: [],
    };
  }

  return {
    updatedAt: snap.updatedAt,
    matchCount: snap.matchCount,
    averageRecurrenceScore: snap.averageRecurrenceScore,
    recurrenceLeaders: snap.recurrenceLeaders,
    offensiveCycles: snap.offensiveCycles,
    fakeMomentumAlerts: snap.fakeMomentumAlerts,
    collapseCycles: snap.collapseCycles,
    dominanceCurves: snap.dominanceCurves,
    sustainedChaos: snap.sustainedChaos,
  };
}

function buildMicroeventSnapshot(): OpsMicroeventSnapshot {
  const snap = getMicroeventOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      matchCount: 0,
      averageMicroeventScore: 0,
      chaosBursts: [],
      territorialPressure: [],
      attackWaves: [],
      collapseAlerts: [],
      emotionalTilt: [],
      topTriggerWindows: [],
    };
  }

  return {
    updatedAt: snap.updatedAt,
    matchCount: snap.matchCount,
    averageMicroeventScore: snap.averageMicroeventScore,
    chaosBursts: snap.chaosBursts,
    territorialPressure: snap.territorialPressure,
    attackWaves: snap.attackWaves,
    collapseAlerts: snap.collapseAlerts,
    emotionalTilt: snap.emotionalTilt,
    topTriggerWindows: snap.topTriggerWindows,
  };
}

function buildPlayerImpactSnapshot(): OpsPlayerImpactSnapshot {
  const snap = getPlayerOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      matchCount: 0,
      topClutchPlayers: [],
      fatigueAlerts: [],
      goalkeeperResistance: [],
      substitutionImpacts: [],
      chaosContributors: [],
    };
  }

  return {
    updatedAt: snap.updatedAt,
    matchCount: snap.matchCount,
    topClutchPlayers: snap.topClutchPlayers,
    fatigueAlerts: snap.fatigueAlerts,
    goalkeeperResistance: snap.goalkeeperResistance,
    substitutionImpacts: snap.substitutionImpacts,
    chaosContributors: snap.chaosContributors,
  };
}

function buildTemporalSnapshot(): OpsTemporalSnapshot {
  const snap = getTemporalOpsSnapshot();
  if (!snap) {
    return {
      updatedAt: null,
      matchCount: 0,
      averageChaos: 0,
      averageAcceleration: 0,
      averageUrgency: 0,
      averageVolatility: 0,
      criticalCount: 0,
      highPriorityCount: 0,
      chaosMap: [],
    };
  }

  return {
    updatedAt: snap.updatedAt,
    matchCount: snap.matchCount,
    averageChaos: snap.averageChaos,
    averageAcceleration: snap.averageAcceleration,
    averageUrgency: snap.averageUrgency,
    averageVolatility: snap.averageVolatility,
    criticalCount: snap.criticalCount,
    highPriorityCount: snap.highPriorityCount,
    chaosMap: snap.chaosMap,
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
  const signalDecision = buildSignalDecisionSnapshot();
  const backtest = buildBacktestSnapshot();
  const marketCalibration = buildMarketCalibrationSnapshot();
  const temporal = buildTemporalSnapshot();
  const playerImpact = buildPlayerImpactSnapshot();
  const microevent = buildMicroeventSnapshot();
  const sequenceMemory = buildSequenceMemorySnapshot();
  const metaConsensus = buildMetaConsensusSnapshot();
  const dataQuality = buildDataQualitySnapshot();
  const autoDispatch = buildAutoDispatchSnapshot();
  const validation = buildValidationSnapshot();
  const apiUsage = buildApiUsageSnapshot();

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
    signalDecision,
    backtest,
    marketCalibration,
    temporal,
    playerImpact,
    microevent,
    sequenceMemory,
    metaConsensus,
    dataQuality,
    autoDispatch,
    validation,
    apiUsage,
    meta: {
      fetchedAt: new Date().toISOString(),
      responseTimeMs,
      historyUpdatedAt: store.historyUpdatedAt,
    },
  };
}
