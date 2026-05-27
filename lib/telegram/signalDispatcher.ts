/**
 * Telegram signal dispatcher — real send, queue, dedup, 5 min cooldown, retry.
 */

import type { Signal } from "@/types/domain";
import { recordOpsEvent } from "@/lib/ops/opsStore";
import { formatSignalForTelegram } from "@/lib/telegram/signalFormatter";
import { persistDispatchLog } from "@/lib/telegram/telegramDispatchPersistence";
import {
  recordTelegramDispatchFailure,
  recordTelegramDispatchSuccess,
} from "@/lib/telegram/telegramDispatchState";
import {
  isTelegramSandboxMode,
  sendTelegramMessageWithRetry,
} from "@/lib/telegram/telegramClient";
import {
  TELEGRAM_COOLDOWN_MS,
  TELEGRAM_GLOBAL_COOLDOWN_MS,
} from "@/lib/telegram/constants";
import { logInfo, logWarn } from "@/lib/utils/logger";

export { TELEGRAM_COOLDOWN_MS } from "@/lib/telegram/constants";
import type {
  TelegramDispatchRequest,
  TelegramDispatchResult,
  TelegramFormattedMessage,
  TelegramQueueStats,
  TelegramSignalSource,
} from "@/types/telegram";

const LOG_SCOPE = "signal-dispatcher";

interface CooldownEntry {
  lastDispatchedAt: number;
  signalId: string;
}

export class SignalDispatcher {
  private readonly queue: TelegramFormattedMessage[] = [];
  private processing = false;
  private readonly cooldownByFingerprint = new Map<string, CooldownEntry>();
  private readonly locks = new Set<string>();
  private lastGlobalDispatchAt = 0;

  dispatch(request: TelegramDispatchRequest): TelegramDispatchResult {
    const formatted = formatSignalForTelegram(request);

    if (this.locks.has(formatted.fingerprint)) {
      return this.skip(formatted, "lock_active", "skipped_duplicate");
    }

    if (this.isInQueue(formatted.fingerprint)) {
      return this.skip(formatted, "already_in_queue", "skipped_duplicate");
    }

    if (this.isOnCooldown(formatted.fingerprint)) {
      return this.skip(formatted, "cooldown", "cooldown_blocked");
    }

    this.locks.add(formatted.fingerprint);
    this.cooldownByFingerprint.set(formatted.fingerprint, {
      lastDispatchedAt: Date.now(),
      signalId: formatted.signalId,
    });

    this.queue.push(formatted);

    logInfo(LOG_SCOPE, "Signal queued for Telegram", {
      signalId: formatted.signalId,
      fingerprint: formatted.fingerprint,
      queueDepth: this.queue.length,
      sandbox: isTelegramSandboxMode(),
    });

    void recordOpsEvent({
      event: "queued",
      signalId: formatted.signalId,
      modelId: formatted.modelId,
      source: formatted.source,
      matchId: formatted.matchId,
      market: formatted.market,
      status: "queued",
      message: `Telegram queued: ${formatted.signalId}`,
    });

    void this.processQueue();

    return {
      signalId: formatted.signalId,
      fingerprint: formatted.fingerprint,
      queued: true,
      skipped: false,
    };
  }

  dispatchProductionSignals(
    signals: Signal[],
    modelId: string,
    options?: {
      minuteByMatchId?: Record<string, number>;
      momentumByMatchId?: Record<string, string>;
      reasonByMatchId?: Record<string, string>;
    }
  ): TelegramDispatchResult[] {
    const bestByFixture = new Map<string, Signal>();
    for (const signal of signals) {
      const fixtureId = signal.matchId.replace(/^sm-/, "") || signal.matchId;
      const prev = bestByFixture.get(fixtureId);
      if (!prev || signal.confidence > prev.confidence) {
        bestByFixture.set(fixtureId, signal);
      }
    }

    return Array.from(bestByFixture.values()).map((signal) =>
      this.dispatch({
        signal,
        source: "production",
        modelId,
        minute: options?.minuteByMatchId?.[signal.matchId],
        momentum: options?.momentumByMatchId?.[signal.matchId],
        reason: options?.reasonByMatchId?.[signal.matchId] ?? signal.reason,
        fixtureId: signal.matchId.replace(/^sm-/, ""),
      })
    );
  }

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

  private skip(
    formatted: TelegramFormattedMessage,
    reason: string,
    event: "skipped_duplicate" | "cooldown_blocked"
  ): TelegramDispatchResult {
    logInfo(LOG_SCOPE, "Signal skipped", {
      signalId: formatted.signalId,
      fingerprint: formatted.fingerprint,
      reason,
    });

    void recordOpsEvent({
      event,
      signalId: formatted.signalId,
      modelId: formatted.modelId,
      source: formatted.source,
      matchId: formatted.matchId,
      market: formatted.market,
      status: event === "cooldown_blocked" ? "cooldown" : "skipped",
      message: `Skipped (${reason}): ${formatted.signalId}`,
      level: event === "cooldown_blocked" ? "warn" : undefined,
    });

    return {
      signalId: formatted.signalId,
      fingerprint: formatted.fingerprint,
      queued: false,
      skipped: true,
      skipReason: reason,
    };
  }

  private isInQueue(fingerprint: string): boolean {
    return this.queue.some((m) => m.fingerprint === fingerprint);
  }

  private isOnCooldown(fingerprint: string): boolean {
    const entry = this.cooldownByFingerprint.get(fingerprint);
    if (!entry) return false;
    return Date.now() - entry.lastDispatchedAt < TELEGRAM_COOLDOWN_MS;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      while (this.queue.length > 0) {
        const message = this.queue.shift();
        if (!message) continue;

        const now = Date.now();
        if (now - this.lastGlobalDispatchAt < TELEGRAM_GLOBAL_COOLDOWN_MS) {
          this.queue.unshift(message);
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              TELEGRAM_GLOBAL_COOLDOWN_MS - (now - this.lastGlobalDispatchAt)
            )
          );
          continue;
        }

        const fixtureId = message.matchId.replace(/^sm-/, "");
        const startedAt = Date.now();
        const result = await sendTelegramMessageWithRetry(message.text, {
          signalId: message.signalId,
          source: message.source,
          route: {
            pipeline: "signal",
            alertType: message.market,
            fixtureId,
            signalId: message.signalId,
            tags: ["signal", message.source],
          },
        });
        const latencyMs = Date.now() - startedAt;

        if (result.sandbox) {
          recordTelegramDispatchSuccess(message.signalId, latencyMs);
          void persistDispatchLog({
            dispatchId: message.signalId,
            signalId: message.signalId,
            modelId: message.modelId,
            source: message.source,
            matchId: message.matchId,
            fixtureId,
            market: message.market,
            status: "sandbox",
            latencyMs,
            message: "Sandbox dispatch",
          });
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
          this.lastGlobalDispatchAt = Date.now();
          recordTelegramDispatchSuccess(message.signalId, latencyMs);
          void persistDispatchLog({
            dispatchId: message.signalId,
            signalId: message.signalId,
            modelId: message.modelId,
            source: message.source,
            matchId: message.matchId,
            fixtureId,
            market: message.market,
            status: "dispatched",
            latencyMs,
            message: "Telegram sent",
            metadata: { messageId: result.messageId },
          });
          void recordOpsEvent({
            event: "telegram_sent",
            signalId: message.signalId,
            modelId: message.modelId,
            source: message.source,
            matchId: message.matchId,
            market: message.market,
            status: "dispatched",
            latencyMs,
            message: `Telegram sent: ${message.signalId}`,
          });
        } else {
          recordTelegramDispatchFailure(
            message.signalId,
            result.error ?? "unknown",
            latencyMs
          );
          void persistDispatchLog({
            dispatchId: message.signalId,
            signalId: message.signalId,
            modelId: message.modelId,
            source: message.source,
            matchId: message.matchId,
            fixtureId,
            market: message.market,
            status: "failed",
            latencyMs,
            errorMessage: result.error,
          });
          void recordOpsEvent({
            event: "telegram_failed",
            signalId: message.signalId,
            modelId: message.modelId,
            source: message.source,
            matchId: message.matchId,
            market: message.market,
            status: "failed",
            latencyMs,
            error: result.error,
            message: `Telegram failed: ${message.signalId} — ${result.error ?? "unknown"}`,
            level: "error",
          });
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
            message: `Dispatch failed: ${message.signalId}`,
            level: "error",
          });
        }

        this.locks.delete(message.fingerprint);

        if (this.cooldownByFingerprint.size > 500) {
          const cutoff = Date.now() - TELEGRAM_COOLDOWN_MS * 2;
          for (const [fp, entry] of this.cooldownByFingerprint.entries()) {
            if (entry.lastDispatchedAt < cutoff) {
              this.cooldownByFingerprint.delete(fp);
            }
          }
        }
      }
    } catch (error) {
      const errMessage = error instanceof Error ? error.message : "Unknown error";
      logWarn(LOG_SCOPE, "Queue processing error", { message: errMessage });
    } finally {
      this.processing = false;
      if (this.queue.length > 0) void this.processQueue();
    }
  }
}

export const signalDispatcher = new SignalDispatcher();

export function dispatchSignalToTelegram(
  request: TelegramDispatchRequest
): TelegramDispatchResult {
  return signalDispatcher.dispatch(request);
}

export function dispatchSignalsToTelegram(
  signals: Signal[],
  source: TelegramSignalSource,
  modelId: string,
  options?: {
    minuteByMatchId?: Record<string, number>;
    momentumByMatchId?: Record<string, string>;
    reasonByMatchId?: Record<string, string>;
  }
): TelegramDispatchResult[] {
  if (source === "production") {
    return signalDispatcher.dispatchProductionSignals(signals, modelId, options);
  }
  return signalDispatcher.dispatchExperimentalSignals(signals, modelId, options);
}
