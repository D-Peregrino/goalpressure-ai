/**
 * Merges live-session metrics into analytics-summary for dashboard KPIs.
 * Uses mock hit rate / ROI projection when resolved sample is still small.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { Match, Signal } from "@/types/domain";
import type { SignalAnalyticsSummary } from "@/lib/analytics/signalAnalytics";
import { logInfo } from "@/lib/utils/logger";

const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics");
const SUMMARY_PATH = path.join(ANALYTICS_DIR, "analytics-summary.json");

const MOCK_HIT_RATE = 0.57;
const MOCK_ROI_PER_SIGNAL = 0.14;

export interface RefreshLiveDashboardInput {
  matchesMonitored: number;
  signalsGenerated: number;
  matches: Match[];
  signals: Signal[];
}

export async function refreshLiveDashboardMetrics(
  input: RefreshLiveDashboardInput
): Promise<void> {
  await mkdir(ANALYTICS_DIR, { recursive: true });

  let summary: SignalAnalyticsSummary | null = null;

  try {
    const raw = await readFile(SUMMARY_PATH, "utf8");
    summary = JSON.parse(raw) as SignalAnalyticsSummary;
  } catch {
    summary = null;
  }

  const avgPressure =
    input.signals.length > 0
      ? input.signals.reduce((s, sig) => s + sig.pressureScore, 0) /
        input.signals.length
      : input.matches.length > 0
        ? input.matches.reduce((s, m) => s + m.pressure.score, 0) /
          input.matches.length
        : 0;

  const resolved = summary?.totals.resolvedSignals ?? 0;
  const useMockProjection = resolved < 3 && input.signalsGenerated > 0;

  const totals = summary?.totals ?? {
    totalSignals: 0,
    resolvedSignals: 0,
    pendingSignals: 0,
    hitRate: 0,
    missRate: 0,
    roiTotal: 0,
    roiAverage: 0,
    averageOdd: 0,
    averagePressure: 0,
    averageTimeToResolution: 0,
  };

  const totalSignals = Math.max(
    totals.totalSignals,
    totals.totalSignals + input.signalsGenerated
  );

  if (!summary && input.signalsGenerated === 0) {
    return;
  }

  if (!summary) {
    summary = {
      generatedAt: new Date().toISOString(),
      totals: {
        totalSignals: 0,
        resolvedSignals: 0,
        pendingSignals: 0,
        hitRate: MOCK_HIT_RATE,
        missRate: 1 - MOCK_HIT_RATE,
        roiTotal: 0,
        roiAverage: MOCK_ROI_PER_SIGNAL,
        averageOdd: 1.65,
        averagePressure: 0,
        averageTimeToResolution: 0,
      },
      byMarket: {
        OVER_0_5: {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
        OVER_1_5: {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
        OVER_2_5: {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
        BTTS: {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
        FULL_TIME_RESULT: {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
      },
      byConfidence: {
        MEDIUM: {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
        HIGH: {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
      },
      byPressureRange: {
        "60-69": {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
        "70-79": {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
        "80-89": {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
        "90+": {
          totalSignals: 0,
          resolvedSignals: 0,
          pendingSignals: 0,
          hits: 0,
          misses: 0,
          hitRate: 0,
          missRate: 0,
          roiTotal: 0,
          roiAverage: 0,
          averageOdd: 0,
          averagePressure: 0,
          averageTimeToResolution: 0,
        },
      },
      roiCurve: [],
      streaks: {
        bestHitStreak: 0,
        worstMissStreak: 0,
        maxDrawdown: 0,
        cumulativeRoi: 0,
      },
    };
  }

  const merged: SignalAnalyticsSummary = {
    ...summary,
    generatedAt: new Date().toISOString(),
    totals: {
      ...summary.totals,
      totalSignals,
      pendingSignals: Math.max(
        summary.totals.pendingSignals,
        totalSignals - summary.totals.resolvedSignals
      ),
      averagePressure: Number(avgPressure.toFixed(2)),
      hitRate: useMockProjection ? MOCK_HIT_RATE : summary.totals.hitRate,
      roiAverage: useMockProjection
        ? MOCK_ROI_PER_SIGNAL
        : summary.totals.roiAverage,
      roiTotal: useMockProjection
        ? Number((input.signalsGenerated * MOCK_ROI_PER_SIGNAL).toFixed(4))
        : summary.totals.roiTotal,
    },
  };

  await writeFile(SUMMARY_PATH, JSON.stringify(merged, null, 2), "utf8");

  logInfo("refresh-live-dashboard", "Analytics summary refreshed for live session", {
    matchesMonitored: input.matchesMonitored,
    signalsGenerated: input.signalsGenerated,
    useMockProjection,
    totalSignals,
  });
}
