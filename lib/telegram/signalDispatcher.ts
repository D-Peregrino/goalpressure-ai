/**
 * Telegram signal dispatcher — queue, deduplication, cooldown, sandbox-safe delivery.
 *
 * Pipeline: signalEngine → dispatcher → formatter → telegramClient
 * (Not wired to production runtime yet.)
 */

import type { Signal } from "@/types/domain";
import { recordOpsEvent } from "@/lib/ops/opsStore";
import { formatSignalForTelegram } from "@/lib/telegram/signalFormatter";
import { sendTelegramMessage } from "@/lib/telegram/telegramClient";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type {
  TelegramDispatchRequest,
  TelegramDispatchResult,
  TelegramFormattedMessage,
  TelegramQueueStats,
  TelegramSignalSource,
} from "@/types/telegram";

const LOG_SCOPE = "signal-dispatcher";
export const TELEGRAM_COOLDOWN_MS = 3 * 60 * 1000;

interface CooldownEntry {
  lastQueuedAt: number;
  signalId: string;
}

export class SignalDispatcher {
  private readonly queue: TelegramFormattedMessage[] = [];
  private processing = false;
  private readonly cooldownByFingerprint = new Map<string, CooldownEntry>();

  /**
   * Enqueue a single signal for Telegram delivery.
   */
  dispatch(request: TelegramDispatchRequest): TelegramDispatchResult {
    const formatted = formatSignalForTelegram(request);

    if (this.isInQueue(formatted.fingerprint)) {
      logInfo(LOG_SCOPE, "Signal skipped duplicate", {
        signalId: formatted.signalId,
        fingerprint: formatted.fingerprint,
        reason: "already_in_queue",
      });

      void recordOpsEvent({
        event: "skipped_duplicate",
        signalId: formatted.signalId,
        modelId: formatted.modelId,
        source: formatted.source,
        matchId: formatted.matchId,
        market: formatted.market,
        status: "skipped",
        message: `Duplicate skipped (in queue): ${formatted.signalId}`,
      });

      return {
        signalId: formatted.signalId,
        fingerprint: formatted.fingerprint,
        queued: false,
        skipped: true,
        skipReason: "already_in_queue",
      };
    }

    if (this.isOnCooldown(formatted.fingerprint)) {
      logInfo(LOG_SCOPE, "Signal skipped duplicate", {
        signalId: formatted.signalId,
        fingerprint: formatted.fingerprint,
        reason: "cooldown",
      });

      void recordOpsEvent({
        event: "cooldown_blocked",
        signalId: formatted.signalId,
        modelId: formatted.modelId,
        source: formatted.source,
        matchId: formatted.matchId,
        market: formatted.market,
        status: "cooldown",
        message: `Cooldown blocked (${TELEGRAM_COOLDOWN_MS / 1000}s): ${formatted.signalId}`,
        level: "warn",
      });

      return {
        signalId: formatted.signalId,
        fingerprint: formatted.fingerprint,
        queued: false,
        skipped: true,
        skipReason: "cooldown",
      };
    }

    this.cooldownByFingerprint.set(formatted.fingerprint, {
      lastQueuedAt: Date.now(),
      signalId: formatted.signalId,
    });

    this.queue.push(formatted);

    logInfo(LOG_SCOPE, "Signal queued", {
      signalId: formatted.signalId,
      source: formatted.source,
      modelId: formatted.modelId,
      matchId: formatted.matchId,
      market: formatted.market,
      queueDepth: this.queue.length,
    });

    void recordOpsEvent({
      event: "queued",
      signalId: formatted.signalId,
      modelId: formatted.modelId,
      source: formatted.source,
      matchId: formatted.matchId,
      market: formatted.market,
      status: "queued",
      message: `Signal queued: ${formatted.signalId} · ${formatted.source}`,
    });

    void this.processQueue();

    return {
      signalId: formatted.signalId,
      fingerprint: formatted.fingerprint,
      queued: true,
      skipped: false,
    };
  }

  /** Queue multiple production signals from the active model. */
  dispatchProductionSignals(
    signals: Signal[],
    modelId: string,
    options?: { minuteByMatchId?: Record<string, number> }
  ): TelegramDispatchResult[] {
    return signals.map((signal) =>
      this.dispatch({
        signal,
        source: "production",
        modelId,
        minute: options?.minuteByMatchId?.[signal.matchId],
      })
    );
  }

  /** Queue experimental A/B signals for a specific model version. */
  dispatchExperimentalSignals(
    signals: Signal[],
    modelId: string,
    options?: { minuteByMatchId?: Record<string, number> }
  ): TelegramDispatchResult[] {
    return signals.map((signal) =>
      this.dispatch({
        signal,
        source: "experimental",
        modelId,
        minute: options?.minuteByMatchId?.[signal.matchId],
      })
    );
  }

  getQueueStats(): TelegramQueueStats {
    return {
      pending: this.queue.length,
      processing: this.processing,
      recentFingerprints: this.cooldownByFingerprint.size,
    };
  }

  private isInQueue(fingerprint: string): boolean {
    return this.queue.some((m) => m.fingerprint === fingerprint);
  }

  private isOnCooldown(fingerprint: string): boolean {
    const entry = this.cooldownByFingerprint.get(fingerprint);
    if (!entry) return false;
    return Date.now() - entry.lastQueuedAt < TELEGRAM_COOLDOWN_MS;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift();
        if (!message) continue;

        const startedAt = Date.now();
        const result = await sendTelegramMessage(message.text, {
          signalId: message.signalId,
          source: message.source,
        });
        const latencyMs = Date.now() - startedAt;

        if (result.sandbox) {
          void recordOpsEvent({
            event: "sandbox_dispatch",
            signalId: message.signalId,
            modelId: message.modelId,
            source: message.source,
            matchId: message.matchId,
            market: message.market,
            status: "sandbox",
            latencyMs,
            message: `Sandbox dispatch: ${message.signalId}`,
          });
        } else if (result.ok) {
          void recordOpsEvent({
            event: "dispatched",
            signalId: message.signalId,
            modelId: message.modelId,
            source: message.source,
            matchId: message.matchId,
            market: message.market,
            status: "dispatched",
            latencyMs,
            message: `Dispatched: ${message.signalId}`,
          });
        } else {
          void recordOpsEvent({
            event: "failed",
            signalId: message.signalId,
            modelId: message.modelId,
            source: message.source,
            matchId: message.matchId,
            market: message.market,
            status: "failed",
            latencyMs,
            error: result.error,
            message: `Dispatch failed: ${message.signalId} — ${result.error ?? "unknown"}`,
            level: "error",
          });
        }
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Unknown error";
      logWarn(LOG_SCOPE, "Queue processing error", { message: errMessage });
    } finally {
      this.processing = false;

      if (this.queue.length > 0) {
        void this.processQueue();
      }
    }
  }
}

/** Shared dispatcher instance (not connected to live runtime yet). */
export const signalDispatcher = new SignalDispatcher();

/**
 * Convenience entry: format + queue + deliver via Telegram client.
 */
export function dispatchSignalToTelegram(
  request: TelegramDispatchRequest
): TelegramDispatchResult {
  return signalDispatcher.dispatch(request);
}

export function dispatchSignalsToTelegram(
  signals: Signal[],
  source: TelegramSignalSource,
  modelId: string,
  options?: { minuteByMatchId?: Record<string, number> }
): TelegramDispatchResult[] {
  if (source === "production") {
    return signalDispatcher.dispatchProductionSignals(signals, modelId, options);
  }
  return signalDispatcher.dispatchExperimentalSignals(signals, modelId, options);
}
