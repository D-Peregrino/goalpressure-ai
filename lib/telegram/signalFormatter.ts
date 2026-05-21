import { createHash } from "crypto";
import { getMarketLabel } from "@/types/domain";
import type { MarketType, Signal } from "@/types/domain";
import type {
  TelegramDispatchRequest,
  TelegramFormattedMessage,
  TelegramSignalSource,
} from "@/types/telegram";

/** Live production fingerprint: fixture + market (5 min cooldown lock). */
export function buildLiveDispatchFingerprint(
  matchId: string,
  market: MarketType
): string {
  const fixtureId = matchId.replace(/^sm-/, "") || matchId;
  return `live|${fixtureId}|${market}`;
}

export function buildSignalFingerprint(
  signal: Signal,
  source: TelegramSignalSource,
  modelId: string
): string {
  if (source === "production") {
    return buildLiveDispatchFingerprint(signal.matchId, signal.market);
  }
  return `${source}|${modelId}|${signal.matchId}|${signal.market}|${signal.confidence}`;
}

export function buildSignalId(
  signal: Signal,
  source: TelegramSignalSource,
  modelId: string
): string {
  if (source === "production") {
    const fixtureId = signal.matchId.replace(/^sm-/, "") || signal.matchId;
    const hash = createHash("sha256")
      .update(`${fixtureId}|${signal.market}|${modelId}`)
      .digest("hex")
      .slice(0, 10);
    return `gp-live-${fixtureId}-${hash}`;
  }

  const hash = createHash("sha256")
    .update(buildSignalFingerprint(signal, source, modelId))
    .digest("hex")
    .slice(0, 12);

  return `gp-${source.slice(0, 4)}-${signal.matchId.replace(/[^a-zA-Z0-9]/g, "")}-${hash}`;
}

function marketLabelLive(market: MarketType): string {
  if (market === "OVER_0_5") return "Over 0.5 Goal Live";
  if (market === "OVER_1_5") return "Over 1.5 Goals Live";
  return getMarketLabel(market);
}

function formatReasonBlock(reason: string): string[] {
  const lines = reason
    .split(/[.·]\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return [
      "High offensive pressure detected.",
      "Dangerous attacks increasing.",
      "Odd above fair value.",
    ];
  }

  return lines.slice(0, 4);
}

/**
 * Professional institutional Telegram body (MVP V1).
 */
export function formatInstitutionalSignalMessage(
  request: TelegramDispatchRequest,
  signalId: string
): string {
  const { signal, modelId, minute, momentum, reason } = request;
  const minuteLabel = minute != null ? `${minute}'` : "—";
  const momentumLabel = momentum ?? "RISING";
  const reasonLines = reason
    ? formatReasonBlock(reason)
    : formatReasonBlock(signal.reason);

  return [
    "🚨 GOALPRESSURE AI SIGNAL",
    "",
    "Match:",
    signal.matchLabel,
    "",
    "Market:",
    marketLabelLive(signal.market),
    "",
    "Minute:",
    minuteLabel,
    "",
    "Pressure Score:",
    `${Math.round(signal.pressureScore)}/100`,
    "",
    "Confidence:",
    signal.confidence,
    "",
    "Current Odd:",
    signal.odd.toFixed(2),
    "",
    "Momentum:",
    momentumLabel,
    "",
    "Reason:",
    ...reasonLines,
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
  const signalId = request.signalIdOverride ?? buildSignalId(
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
