import type { MarketType, Signal, SignalConfidence } from "@/types/domain";

/** Origin of the signal in the GoalPressure pipeline */
export type TelegramSignalSource = "production" | "experimental";

export interface TelegramConfig {
  botToken: string | null;
  chatId: string | null;
  sandboxMode: boolean;
}

export interface TelegramDispatchRequest {
  signal: Signal;
  source: TelegramSignalSource;
  modelId: string;
  /** Match minute at dispatch time (optional until wired to live feed) */
  minute?: number;
}

export interface TelegramFormattedMessage {
  signalId: string;
  fingerprint: string;
  text: string;
  source: TelegramSignalSource;
  modelId: string;
  matchId: string;
  market: MarketType;
  confidence: SignalConfidence;
  dispatchedAt: string;
}

export interface TelegramSendResult {
  ok: boolean;
  sandbox: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  reason?: string;
}

export interface TelegramDispatchResult {
  signalId: string;
  fingerprint: string;
  queued: boolean;
  skipped: boolean;
  skipReason?: string;
}

export interface TelegramQueueStats {
  pending: number;
  processing: boolean;
  recentFingerprints: number;
}
