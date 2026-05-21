/**
 * GoalPressure AI — Live Validation Engine.
 * Validação quantitativa contínua e sugestões de calibração (sem novos motores).
 */

import { SIGNAL_DECISION_THRESHOLDS } from "@/lib/engine/signalDecisionEngine";
import {
  buildEngineConsensusAnalysis,
  buildFalsePositiveAnalysis,
  buildMarketEfficiencyAnalysis,
  buildPerformanceBreakdown,
  loadAndAnalyzeHistoricalTrades,
  type AnalyzedTrade,
} from "@/lib/validation/validationHistoricalAnalyzer";
import { fetchTelegramDispatchStats } from "@/lib/validation/validationPersistence";
import type {
  CalibrationSuggestion,
  LiveValidationInput,
  LiveValidationResult,
  TelegramPerformanceAnalysis,
  ValidationLabSnapshot,
  ValidationReliability,
} from "@/types/validation";

const LOG_SCOPE = "live-validation-engine";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function resolveReliability(score: number): ValidationReliability {
  if (score >= 72) return "HIGH";
  if (score >= 48) return "MEDIUM";
  return "LOW";
}

function buildSegmentTags(input: LiveValidationInput): string[] {
  const tags: string[] = [];
  if (input.executionGrade) tags.push(`grade:${input.executionGrade}`);
  if (input.league) tags.push(`league:${input.league}`);
  if (input.market) tags.push(`market:${input.market}`);
  tags.push(`phase:${input.temporalPhase}`);
  tags.push(
    `chaos:${input.chaosLevel >= 70 ? "HIGH" : input.chaosLevel >= 45 ? "MEDIUM" : "LOW"}`
  );
  tags.push(`window:${input.triggerWindow}`);
  if (input.pressureScore >= 80) tags.push("pressure:80-100");
  else if (input.pressureScore >= 65) tags.push("pressure:65-79");
  else tags.push("pressure:0-64");
  if (input.confidence >= 75) tags.push("confidence:75-100");
  else if (input.confidence >= 55) tags.push("confidence:55-74");
  else tags.push("confidence:0-54");
  return tags;
}

/**
 * Validação por fixture no ciclo live (score + flags, sem motor novo).
 */
export function calculateLiveValidation(
  input: LiveValidationInput
): LiveValidationResult {
  const flags: string[] = [];
  let score = 55;

  if (input.usableForSignal) score += 8;
  else {
    score -= 18;
    flags.push("DATA_NOT_USABLE");
  }

  if (input.falsePositiveRisk >= 65) {
    score -= 22;
    flags.push("HIGH_FP_RISK");
  } else if (input.falsePositiveRisk >= 45) {
    score -= 10;
    flags.push("ELEVATED_FP_RISK");
  }

  if (input.fakeMomentumProbability >= 55) {
    score -= 14;
    flags.push("FAKE_MOMENTUM");
  }

  if (input.edgePersistence < 35 && input.ev > 0.05) {
    score -= 12;
    flags.push("EDGE_NOT_PERSISTENT");
  }

  if (input.engineConflict >= 45) {
    score -= 10;
    flags.push("ENGINE_CONFLICT");
  }

  if (input.marketLag && input.ev > 0.06) {
    score += 6;
    flags.push("MARKET_LAG_OPPORTUNITY");
  }

  if (
    input.executionDecision === "EXECUTE" ||
    input.executionDecision === "AGGRESSIVE_EXECUTE"
  ) {
    score += 10;
    flags.push("META_APPROVED");
  }

  if (input.pressureScore >= SIGNAL_DECISION_THRESHOLDS.minPressureScore) {
    score += 5;
  }

  if (input.chaosLevel >= 70 && input.momentum < 50) {
    score -= 8;
    flags.push("CHAOS_NO_MOMENTUM");
  }

  const validationScore = roundScore(score);
  const reliability = resolveReliability(validationScore);

  return {
    fixtureId: input.fixtureId,
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    minute: input.minute,
    validationScore,
    falsePositiveRisk: roundScore(input.falsePositiveRisk),
    reliability,
    segmentTags: buildSegmentTags(input),
    flags,
    usableForCalibration: validationScore >= 50 && input.usableForSignal,
    computedAt: new Date().toISOString(),
  };
}

export function generateCalibrationSuggestions(
  snapshot: Pick<
    ValidationLabSnapshot,
    "performance" | "falsePositives" | "telegramPerformance" | "hitRate" | "roi"
  >
): CalibrationSuggestion[] {
  const suggestions: CalibrationSuggestion[] = [];
  let id = 0;
  const nextId = () => `cal-${++id}`;

  const lowPressure = snapshot.performance.byPressureRange.find(
    (r) => r.label === "0-64" && r.total >= 8 && r.hitRate < 0.42
  );
  if (lowPressure) {
    suggestions.push({
      id: nextId(),
      action: "INCREASE_MIN_PRESSURE",
      priority: "HIGH",
      title: "Aumentar minPressure",
      detail: `Faixa ${lowPressure.label} com hit ${(lowPressure.hitRate * 100).toFixed(0)}% em ${lowPressure.total} sinais.`,
      metric: "hitRate_by_pressure",
      currentValue: SIGNAL_DECISION_THRESHOLDS.minPressureScore,
      suggestedValue: SIGNAL_DECISION_THRESHOLDS.minPressureScore + 5,
    });
  }

  if (snapshot.falsePositives.fakeMomentum.length >= 8) {
    suggestions.push({
      id: nextId(),
      action: "REDUCE_CHAOS_SENSITIVITY",
      priority: "HIGH",
      title: "Reduzir sensibilidade a chaos",
      detail: `${snapshot.falsePositives.fakeMomentum.length} casos de fake momentum detectados.`,
      metric: "fake_momentum_cases",
      currentValue: snapshot.falsePositives.fakeMomentum.length,
    });
  }

  const lowConf = snapshot.performance.byConfidenceRange.find(
    (r) => r.label === "0-54" && r.total >= 6 && r.hitRate < 0.4
  );
  if (lowConf) {
    suggestions.push({
      id: nextId(),
      action: "INCREASE_CONFIDENCE_THRESHOLD",
      priority: "MEDIUM",
      title: "Aumentar confidence threshold",
      detail: `Confiança ${lowConf.label}: hit ${(lowConf.hitRate * 100).toFixed(0)}%.`,
      metric: "hitRate_by_confidence",
      suggestedValue: 60,
    });
  }

  const badLeagues = snapshot.performance.byLeague.filter(
    (r) => r.total >= 5 && r.roi < -0.15
  );
  for (const league of badLeagues.slice(0, 3)) {
    suggestions.push({
      id: nextId(),
      action: "BLOCK_LEAGUE",
      priority: "MEDIUM",
      title: `Bloquear liga: ${league.label}`,
      detail: `ROI ${league.roi.toFixed(2)}u em ${league.total} trades.`,
      metric: "league_roi",
      currentValue: league.roi,
    });
  }

  const lateWindow = snapshot.performance.byTriggerWindow.find(
    (r) => r.label === "80+" && r.total >= 5 && r.hitRate < 0.35
  );
  if (lateWindow) {
    suggestions.push({
      id: nextId(),
      action: "TIGHTEN_TRIGGER_WINDOW",
      priority: "MEDIUM",
      title: "Restringir janela 80+",
      detail: `Hit ${(lateWindow.hitRate * 100).toFixed(0)}% na janela tardia.`,
      metric: "trigger_window_80plus",
    });
  }

  if (snapshot.telegramPerformance.spamRatio > 0.25) {
    suggestions.push({
      id: nextId(),
      action: "INCREASE_META_THRESHOLD",
      priority: "HIGH",
      title: "Endurecer gate Meta antes do Telegram",
      detail: `Spam ratio ${(snapshot.telegramPerformance.spamRatio * 100).toFixed(0)}% — priorizar EXECUTE com confiança maior.`,
      metric: "telegram_spam_ratio",
      currentValue: snapshot.telegramPerformance.spamRatio,
    });
  }

  if (snapshot.roi < 0 && snapshot.hitRate < 0.45) {
    suggestions.push({
      id: nextId(),
      action: "INCREASE_MIN_EV",
      priority: "HIGH",
      title: "Aumentar minEV",
      detail: `ROI agregado ${snapshot.roi.toFixed(2)} · hit ${(snapshot.hitRate * 100).toFixed(0)}%.`,
      metric: "portfolio_roi",
      currentValue: SIGNAL_DECISION_THRESHOLDS.minEv,
      suggestedValue: Math.min(0.15, SIGNAL_DECISION_THRESHOLDS.minEv + 0.02),
    });
  }

  return suggestions.slice(0, 12);
}

function aggregateTradeStats(trades: AnalyzedTrade[]): {
  hitRate: number;
  roi: number;
  profitUnits: number;
  averageEv: number;
} {
  const resolved = trades.filter((t) => t.outcome !== "PENDING");
  const wins = resolved.filter((t) => t.outcome === "WIN").length;
  const profit = resolved.reduce((s, t) => s + t.profitUnits, 0);
  const evSum = trades.reduce((s, t) => s + t.ev, 0);

  return {
    hitRate: resolved.length > 0 ? wins / resolved.length : 0,
    roi: resolved.length > 0 ? profit / resolved.length : 0,
    profitUnits: round4(profit),
    averageEv: trades.length > 0 ? evSum / trades.length : 0,
  };
}

function buildTelegramPerformance(
  trades: AnalyzedTrade[],
  telegramStats: Awaited<ReturnType<typeof fetchTelegramDispatchStats>>
): TelegramPerformanceAnalysis {
  const telegramSent = trades.filter((t) => {
    const d = t as AnalyzedTrade & { telegramSent?: boolean };
    return d.telegramSent === true;
  });

  const resolved = telegramSent.filter((t) => t.outcome !== "PENDING");
  const wins = resolved.filter((t) => t.outcome === "WIN").length;
  const profit = resolved.reduce((s, t) => s + t.profitUnits, 0);

  const sent = telegramStats.queued + telegramStats.sent;
  const totalAttempts = sent + telegramStats.blocked + telegramStats.skipped;
  const spamRatio =
    totalAttempts > 0 ? telegramStats.blocked / totalAttempts : 0;
  const cooldownEfficiency =
    totalAttempts > 0 ? sent / totalAttempts : 0;

  return {
    dispatchesSent: sent,
    dispatchesBlocked: telegramStats.blocked,
    dispatchesQueued: telegramStats.queued,
    conversionRate:
      resolved.length > 0 ? wins / resolved.length : telegramStats.conversionRate,
    roiPerDispatch: resolved.length > 0 ? profit / resolved.length : 0,
    spamRatio: round4(spamRatio),
    cooldownEfficiency: round4(cooldownEfficiency),
    profitUnits: round4(profit),
  };
}

/**
 * Monta snapshot institucional completo do lab (histórico + live fixtures).
 */
export async function buildValidationLabSnapshot(
  liveResults: LiveValidationResult[]
): Promise<ValidationLabSnapshot> {
  const { trades } = await loadAndAnalyzeHistoricalTrades();
  const telegramStats = await fetchTelegramDispatchStats();
  const stats = aggregateTradeStats(trades);

  const performance = buildPerformanceBreakdown(trades);
  const falsePositives = buildFalsePositiveAnalysis(trades);
  const marketEfficiency = buildMarketEfficiencyAnalysis(trades);
  const engineConsensus = buildEngineConsensusAnalysis(trades);
  const telegramPerformance = buildTelegramPerformance(trades, telegramStats);

  const snapshot: ValidationLabSnapshot = {
    updatedAt: new Date().toISOString(),
    source: liveResults.length > 0 ? "hybrid" : "historical",
    tradeCount: trades.length,
    hitRate: round4(stats.hitRate),
    roi: round4(stats.roi),
    profitUnits: stats.profitUnits,
    averageEv: round4(stats.averageEv),
    performance,
    falsePositives,
    marketEfficiency,
    engineConsensus,
    telegramPerformance,
    calibrationSuggestions: [],
    live: liveResults,
  };

  snapshot.calibrationSuggestions = generateCalibrationSuggestions(snapshot);

  return snapshot;
}

export { LOG_SCOPE };
