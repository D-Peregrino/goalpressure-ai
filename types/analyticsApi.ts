import type { SignalAnalyticsSummary } from "@/lib/analytics/signalAnalytics";
import type { MarketType, SignalConfidence } from "@/types/domain";

export type AnalyticsSourceStatus = "READY" | "EMPTY" | "ERROR";

export interface RecentResolvedSignalRow {
  signalId: string;
  matchLabel: string;
  market: MarketType;
  marketLabel: string;
  confidence: SignalConfidence;
  odd: number;
  pressure: number;
  roi: number;
  outcome: "HIT" | "MISS";
  timeToResolution: number | null;
  resolvedAt: string;
}

export interface AnalyticsApiMeta {
  signalsProcessed: number;
  resolvedInTable: number;
  fetchedAt: string;
  responseTimeMs: number;
  sourceStatus: AnalyticsSourceStatus;
  summaryPath: string;
}

export interface AnalyticsApiSuccessResponse {
  ok: true;
  summary: SignalAnalyticsSummary | null;
  recentResolved: RecentResolvedSignalRow[];
  meta: AnalyticsApiMeta;
}

export interface AnalyticsApiErrorResponse {
  ok: false;
  error: { message: string };
  summary: null;
  recentResolved: [];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    sourceStatus: "ERROR";
  };
}

export type AnalyticsApiResponse =
  | AnalyticsApiSuccessResponse
  | AnalyticsApiErrorResponse;
