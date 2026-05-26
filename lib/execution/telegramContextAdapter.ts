import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { QueuedDispatch } from "@/lib/execution/execution.types";
import type { DataQualityLevel } from "@/lib/terminal/matchCardIntelligence";
import type { OperationalState } from "@/lib/signals/executionWindow";

/** Adapta um dispatch enfileirado para leitura via ContextEngine / decisão operacional (sem recalcular engines). */
export function dispatchToContextMatch(item: QueuedDispatch): EnrichedLiveMatch {
  const pressure = item.pressureScore;
  const homeShare = 0.5 + (item.momentumScore > 55 ? 0.12 : item.momentumScore < 45 ? -0.12 : 0);

  const baseDefaults = emptyEnrichedShell(item.fixtureId, item.matchId);

  return {
    ...baseDefaults,
    league: item.league,
    homeTeam: item.homeTeam,
    awayTeam: item.awayTeam,
    homeScore: parseScoreSide(item.scoreDisplay, "home"),
    awayScore: parseScoreSide(item.scoreDisplay, "away"),
    scoreKnown: item.scoreDisplay !== "Ao vivo" && item.scoreDisplay.includes("–"),
    minute: item.minute,
    minuteLabel: `${item.minute}'`,
    pressureScore: pressure,
    homePressure: Math.round(pressure * homeShare),
    awayPressure: Math.round(pressure * (1 - homeShare)),
    momentum: item.momentumScore,
    chaosIndex: item.chaosLevel,
    edgePercent: item.evPercent,
    ev: item.evPercent != null ? item.evPercent / 100 : null,
    confidence: item.confidence,
    fairOdd: item.fairOdd,
    marketOdd: item.marketOdd,
    evPlus: (item.evPercent ?? 0) >= 3,
    dangerousAttacks: Math.round(item.chaosLevel * 0.45 + item.accelerationScore * 0.35),
    engineAccelerationScore: item.accelerationScore,
    engineTerritorialScore: Math.min(100, Math.round(pressure * 0.85)),
    engineMomentumScore: item.momentumScore,
    opsNarrative: item.narrative,
    opsHeadline: item.headline,
    opsChaosLevel: item.chaosLevel,
    opsRiskContext: item.riskContext ?? undefined,
    opsGameState: item.gameState ?? undefined,
    opsTemperature: item.temperature ?? undefined,
    dispatchUrgency: item.urgency,
    dispatchPriority: item.priorityScore,
    cardInsight: item.narrative,
    displayInsight: item.narrative,
    dominantSide:
      item.momentumScore >= 58 ? "home" : item.momentumScore <= 42 ? "away" : "balanced",
    strongestEdgeMarket: String(item.market),
    markets:
      item.marketOdd != null
        ? [{ market: String(item.market), odd: item.marketOdd, edge: item.evPercent ?? undefined }]
        : [],
    validationScore: item.confidence,
    lowConfidence: item.confidence < 45,
    dataQuality: item.confidence < 50 ? "sparse" : "partial",
    isLive: true,
    isPreMatch: false,
  };
}

function parseScoreSide(scoreDisplay: string, side: "home" | "away"): number | null {
  const parts = scoreDisplay.split(/[–×x]/).map((p) => p.trim());
  if (parts.length < 2) return null;
  const n = Number(parts[side === "home" ? 0 : 1]);
  return Number.isFinite(n) ? n : null;
}

function emptyEnrichedShell(fixtureId: string, matchId: string): EnrichedLiveMatch {
  const operationalState = "NEUTRAL" as OperationalState;
  const dataQuality = "partial" as DataQualityLevel;

  return {
    fixtureId,
    matchId,
    league: "",
    homeTeam: "",
    awayTeam: "",
    homeScore: null,
    awayScore: null,
    scoreKnown: false,
    minute: null,
    minuteLabel: "—",
    status: undefined,
    displayStatus: "LIVE",
    homeLogo: null,
    awayLogo: null,
    odds: { primary: 0, over05: 0, over15: 0, over25: 0 },
    pressureScore: 0,
    homePressure: 0,
    awayPressure: 0,
    momentum: 0,
    chaosIndex: 0,
    edgePercent: null,
    ev: null,
    confidence: 50,
    executionGrade: null,
    executionDecision: null,
    sequenceState: null,
    triggerWindow: null,
    microeventScore: null,
    microeventBadges: [],
    recentEvents: [],
    markets: [],
    matchPhase: null,
    dominantSide: "balanced",
    xG: 0,
    shots: 6,
    shotsOnTarget: 2,
    dangerousAttacks: 0,
    corners: 0,
    possession: 50,
    steamMove: false,
    oddsDrift: null,
    fairOdd: null,
    strongestEdgeMarket: null,
    evPlus: false,
    pressureTrend: null,
    premiumFeed: false,
    dominanceLabel: "",
    dangerousSequence: false,
    pressureIndex: null,
    trendMomentum: 0,
    timelineEventsCount: 0,
    operationalState,
    marketOdd: null,
    previousMarketOdd: null,
    steamDirection: "FLAT",
    validationScore: 50,
    urgency: 0,
    isPreMatch: false,
    isLive: true,
    kickoffLabel: null,
    cardInsight: "",
    cardInsightSecondary: null,
    intensityLabel: "",
    volatilityLabel: "",
    dominanceNarrative: null,
    dataQuality,
    lowConfidence: false,
    cardAudit: {
      sourcesUsed: ["dispatch_layer"],
      missingFields: [],
      fallbacksUsed: ["telegram_context_adapter"],
      insightReason: "Leitura derivada do dispatch operacional",
      confidenceReason: "Confiança herdada do candidato de dispatch",
      operationalStateReason: "Estado sintético para mensageria",
      pressureReason: "Pressão do candidato de dispatch",
      rawOperationalState: operationalState,
      finalOperationalState: operationalState,
    },
    tacticalProfile: "NEUTRAL_RHYTHM",
    tacticalProfileLabel: "",
    tacticalNarrative: "",
    tacticalIntensity: 0,
    offensiveControl: "BALANCED",
    emotionalTemperature: 0,
    transitionRisk: 0,
    volatilityProfile: "STABLE",
    tacticalConfidence: 50,
    tacticalReasoning: "",
    tacticalLimitedReading: false,
    tacticalSourcesUsed: [],
    trustLevel: "moderate",
    trustScore: 50,
    trustLabel: "",
    trustSources: [],
    trustVisualWeight: 1,
    displayInsight: "",
  };
}
