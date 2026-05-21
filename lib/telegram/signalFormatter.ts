import { createHash } from "crypto";
import { getMarketLabel } from "@/types/domain";
import type { Signal } from "@/types/domain";
import type {
  TelegramDispatchRequest,
  TelegramFormattedMessage,
  TelegramSignalSource,
} from "@/types/telegram";

export function buildSignalFingerprint(
  signal: Signal,
  source: TelegramSignalSource,
  modelId: string
): string {
  return `${source}|${modelId}|${signal.matchId}|${signal.market}|${signal.confidence}`;
}

export function buildSignalId(
  signal: Signal,
  source: TelegramSignalSource,
  modelId: string
): string {
  const hash = createHash("sha256")
    .update(buildSignalFingerprint(signal, source, modelId))
    .digest("hex")
    .slice(0, 12);

  return `gp-${source.slice(0, 4)}-${signal.matchId.replace(/[^a-zA-Z0-9]/g, "")}-${hash}`;
}

/**
 * Institutional Telegram message body for operational signal delivery.
 */
export function formatInstitutionalSignalMessage(
  request: TelegramDispatchRequest,
  signalId: string
): string {
  const { signal, modelId, minute } = request;
  const marketLabel = getMarketLabel(signal.market);
  const minuteLabel = minute != null ? `${minute}'` : "—";

  return [
    "🚨 GOALPRESSURE AI SIGNAL",
    "",
    "Match:",
    signal.matchLabel,
    "",
    "Market:",
    marketLabel,
    "",
    "Minute:",
    minuteLabel,
    "",
    "Pressure:",
    String(Math.round(signal.pressureScore)),
    "",
    "Odd:",
    signal.odd.toFixed(2),
    "",
    "Confidence:",
    signal.confidence,
    "",
    "Model:",
    modelId,
    "",
    "Signal ID:",
    signalId,
  ].join("\n");
}

export function formatSignalForTelegram(
  request: TelegramDispatchRequest
): TelegramFormattedMessage {
  const signalId = buildSignalId(
    request.signal,
    request.source,
    request.modelId
  );
  const fingerprint = buildSignalFingerprint(
    request.signal,
    request.source,
    request.modelId
  );

  return {
    signalId,
    fingerprint,
    text: formatInstitutionalSignalMessage(request, signalId),
    source: request.source,
    modelId: request.modelId,
    matchId: request.signal.matchId,
    market: request.signal.market,
    confidence: request.signal.confidence,
    dispatchedAt: new Date().toISOString(),
  };
}
