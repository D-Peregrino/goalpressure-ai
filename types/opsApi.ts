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
  runtimeCycles?: number;
  pollingSuccess?: number;
  pollingFailures?: number;
}

export interface OpsTelegramStatus {
  sandboxMode: boolean;
  configured: boolean;
  status: "SANDBOX" | "READY" | "OFFLINE";
  botTokenSet: boolean;
  chatIdSet: boolean;
}

export interface OpsApiSuccessResponse {
  ok: true;
  telegram: OpsTelegramStatus;
  queue: OpsQueueMetrics;
  counters: OpsCounterMetrics;
  recentDispatches: OpsDispatchRecord[];
  logs: OpsLogEntry[];
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
