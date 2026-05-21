import type { MarketType } from "@/types/domain";
import type { TelegramSignalSource } from "@/types/telegram";

export type OpsDispatchStatus =
  | "queued"
  | "dispatched"
  | "sandbox"
  | "failed"
  | "skipped"
  | "cooldown";

export type OpsLogLevel = "info" | "warn" | "error";

export type OpsEventType =
  | "queued"
  | "dispatched"
  | "telegram_sent"
  | "telegram_failed"
  | "skipped_duplicate"
  | "cooldown_blocked"
  | "failed"
  | "sandbox_dispatch"
  | string;

export interface OpsDispatchRecord {
  signalId: string;
  modelId: string;
  source: TelegramSignalSource;
  matchId: string;
  market: MarketType;
  timestamp: string;
  status: OpsDispatchStatus;
  latencyMs?: number;
  error?: string;
}

export interface OpsLogEntry {
  id: string;
  timestamp: string;
  level: OpsLogLevel;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface OpsQueueMetrics {
  queueSize: number;
  processing: boolean;
  cooldownEntries: number;
}

export interface OpsCounterMetrics {
  totalQueued: number;
  totalDispatched: number;
  duplicateSkips: number;
  cooldownBlocked: number;
  sendSuccess: number;
  sendFailed: number;
  sandboxDispatches: number;
  dispatchRatePerMin: number;
  failRate: number;
  averageLatencyMs?: number;
  runtimeCycles?: number;
  pollingSuccess?: number;
  pollingFailures?: number;
}

export interface OpsTelegramStatus {
  sandboxMode: boolean;
  configured: boolean;
  connected: boolean;
  status: "SANDBOX" | "READY" | "OFFLINE" | "ONLINE";
  botTokenSet: boolean;
  chatIdSet: boolean;
  lastDispatch: string | null;
  averageLatencyMs: number;
  totalSent: number;
  totalFailed: number;
}

export interface OpsLivePressureMetric {
  fixtureId: string;
  matchLabel: string;
  minute: number;
  homePressure: number;
  awayPressure: number;
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  confidence: number;
}

export interface OpsLivePressureSnapshot {
  updatedAt: string | null;
  matchCount: number;
  topPressure: OpsLivePressureMetric | null;
  metrics: OpsLivePressureMetric[];
}

export interface OpsApiSuccessResponse {
  ok: true;
  telegram: OpsTelegramStatus;
  queue: OpsQueueMetrics;
  counters: OpsCounterMetrics;
  recentDispatches: OpsDispatchRecord[];
  logs: OpsLogEntry[];
  livePressure: OpsLivePressureSnapshot;
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    historyUpdatedAt: string | null;
  };
}

export interface OpsApiErrorResponse {
  ok: false;
  error: { message: string };
}

export type OpsApiResponse = OpsApiSuccessResponse | OpsApiErrorResponse;
