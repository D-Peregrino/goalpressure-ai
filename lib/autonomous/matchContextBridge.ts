import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { Match } from "@/types/domain";
import type { QueuedDispatch } from "@/lib/execution/execution.types";
import type { DataQualityLevel } from "@/lib/terminal/matchCardIntelligence";
import type { OperationalState } from "@/lib/signals/executionWindow";
import type { AutonomousOperationalAlert } from "@/lib/autonomous/autonomousAlert.types";
import { classifyDispatchUrgency } from "@/lib/execution/urgencyClassifier";

function fid(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function scoreDisplay(match: Match): string {
  if (match.score) return `${match.score.home} – ${match.score.away}`;
  return "Ao vivo";
}

/** Match de domínio → shape para ContextEngine / decisão operacional. */
export function matchToContextMatch(match: Match): EnrichedLiveMatch {
  const pressure = match.pressure?.score ?? 0;
  const offensive = match.feedMeta?.offensiveEngine;
  const smMomentum =
    match.premium?.feedSources?.momentum && (match.premium.momentumScore ?? 0) > 0
      ? match.premium.momentumScore
      : null;
  const momentum = smMomentum ?? offensive?.momentumScore ?? match.premium?.momentumScore ?? 0;
  const acceleration = offensive?.accelerationScore ?? 0;
  const territorial = offensive?.territorialScore ?? Math.round(pressure * 0.8);
  const ev = match.evEngine?.expectedValue.best;
  const ops = match.opsIntelligence;
  const edge = ev?.evPercent ?? match.learningContext?.historicalEdge.score ?? null;

  const homeDa = match.teamStats?.home.dangerousAttacks ?? 0;
  const awayDa = match.teamStats?.away.dangerousAttacks ?? 0;
  const sumDa = homeDa + awayDa || 1;

  const shell = emptyShell(fid(match), match.id);

  return {
    ...shell,
    league: match.league,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    homeScore: match.score?.home ?? null,
    awayScore: match.score?.away ?? null,
    scoreKnown: Boolean(match.score),
    minute: match.minute,
    minuteLabel: `${match.minute}'`,
    status: match.status,
    pressureScore: pressure,
    homePressure: Math.round((pressure * homeDa) / sumDa),
    awayPressure: Math.round((pressure * awayDa) / sumDa),
    momentum,
    chaosIndex: match.chaosIndex ?? ops?.chaosLevel ?? 0,
    edgePercent: typeof edge === "number" && edge < 30 ? edge : (ev?.evPercent ?? null),
    ev: ev?.evPercent != null ? ev.evPercent / 100 : null,
    confidence: match.evEngine?.confidence.score ?? match.autonomousProfile?.autonomousConfidence ?? 55,
    fairOdd: ev?.fairOdds ?? null,
    marketOdd: ev?.marketOdds ?? null,
    oddsDrift: match.feedMeta?.oddsDrift ?? null,
    evPlus: (ev?.evPercent ?? 0) >= 3,
    shots: match.stats.shots,
    shotsOnTarget: match.stats.shotsOnTarget,
    dangerousAttacks: match.stats.dangerousAttacks,
    corners: match.stats.corners,
    possession: match.stats.possession ?? 50,
    engineAccelerationScore: acceleration,
    engineTerritorialScore: territorial,
    engineMomentumScore: momentum,
    opsNarrative: ops?.narrative,
    opsHeadline: ops?.headline,
    opsChaosLevel: ops?.chaosLevel,
    opsRiskContext: ops?.riskContext,
    opsGameState: ops?.gameState,
    opsTemperature: ops?.temperature,
    dispatchUrgency: match.autonomousProfile?.dispatchIntensity,
    cardInsight: ops?.narrative ?? "",
    displayInsight: ops?.narrative ?? "",
    dominantSide:
      homeDa > awayDa + 2 ? "home" : awayDa > homeDa + 2 ? "away" : "balanced",
    strongestEdgeMarket: ev?.market ? String(ev.market) : null,
    pressureTrend: match.feedMeta?.pressureTrend ?? match.pressure.trend ?? null,
    trendMomentum: smMomentum ?? match.premium?.momentumScore ?? momentum,
    dangerousSequence: match.premium?.dangerousSequence ?? false,
    sportmonksMomentum: smMomentum,
    sportmonksMomentumDirection: match.premium?.momentumDirection ?? null,
    commentarySnippets:
      match.premium?.commentary?.slice(-3).map((c) => c.text).filter(Boolean) ?? [],
    sportmonksTimeline: match.premium?.timelineEvents,
    homeXg: match.premium?.xgHome,
    awayXg: match.premium?.xgAway,
    advancedOddsCount: match.premium?.advancedOddsCount,
    sportmonksFeedSources: match.premium?.feedSources ?? match.feedMeta?.sportmonksSources,
    validationScore: match.evEngine?.confidence.score ?? 55,
    lowConfidence: (match.evEngine?.confidence.score ?? 55) < 45,
    dataQuality: (match.evEngine?.confidence.score ?? 55) < 48 ? "sparse" : "partial",
    isLive: match.status === "LIVE" || match.status === "HALFTIME",
    isPreMatch: match.status === "NOT_STARTED",
    triggerWindow: match.premium?.dangerousSequence ? "HOT" : null,
    autonomousFalsePositiveRisk: match.autonomousProfile?.falsePositiveRisk,
    autonomousConfidence: match.autonomousProfile?.autonomousConfidence,
  };
}

export function matchToQueuedDispatch(
  match: Match,
  alert: AutonomousOperationalAlert
): QueuedDispatch {
  const pressure = match.pressure?.score ?? 0;
  const offensive = match.feedMeta?.offensiveEngine;
  const ev = match.evEngine?.expectedValue.best;
  const ops = match.opsIntelligence;

  const candidate = {
    id: alert.id,
    fixtureId: alert.fixtureId,
    matchId: alert.matchId,
    matchLabel: alert.matchLabel,
    league: alert.league,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    signalType: alert.kind,
    market: ev?.market ?? "OVER_0_5",
    source: "OPS_LAYER" as const,
    minute: alert.minute,
    pressureScore: pressure,
    momentumScore: offensive?.momentumScore ?? 0,
    chaosLevel: match.chaosIndex ?? ops?.chaosLevel ?? 0,
    accelerationScore: offensive?.accelerationScore ?? 0,
    evPercent: ev?.evPercent ?? null,
    fairOdd: ev?.fairOdds ?? null,
    marketOdd: ev?.marketOdds ?? null,
    confidence: match.evEngine?.confidence.score ?? 55,
    gameState: ops?.gameState ?? null,
    temperature: ops?.temperature ?? null,
    riskContext: ops?.riskContext ?? null,
    narrative: alert.narrative,
    headline: alert.headline,
    scoreDisplay: scoreDisplay(match),
  };

  const { urgency, priorityScore } = classifyDispatchUrgency(candidate);

  return {
    ...candidate,
    urgency,
    priorityScore,
    routes: ["telegram"],
    queuedAt: alert.createdAt,
  };
}

export function contextMatchToQueuedDispatch(
  match: Match,
  alert: AutonomousOperationalAlert
): QueuedDispatch {
  const item = matchToQueuedDispatch(match, alert);
  const enriched = matchToContextMatch(match);
  return {
    ...item,
    narrative: alert.narrative,
    headline: `Alerta autônomo · ${alert.kindLabel}`,
    pressureScore: enriched.pressureScore,
    momentumScore: enriched.momentum,
    chaosLevel: enriched.chaosIndex,
    accelerationScore: enriched.engineAccelerationScore ?? 0,
    evPercent: enriched.edgePercent,
    confidence: enriched.confidence,
  };
}

function emptyShell(fixtureId: string, matchId: string): EnrichedLiveMatch {
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
    isFinished: false,
    kickoffLabel: null,
    cardInsight: "",
    cardInsightSecondary: null,
    intensityLabel: "",
    volatilityLabel: "",
    dominanceNarrative: null,
    dataQuality,
    lowConfidence: false,
    cardAudit: {
      sourcesUsed: ["autonomous_alert_engine"],
      missingFields: [],
      fallbacksUsed: [],
      insightReason: "Alerta autônomo",
      confidenceReason: "Confiança herdada do match",
      operationalStateReason: "—",
      pressureReason: "Pressão do match",
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
