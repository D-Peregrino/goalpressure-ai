"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { useTerminalSchedule } from "@/hooks/useTerminalSchedule";
import { useOps } from "@/hooks/useOps";
import { useUserWorkspace } from "@/hooks/useUserWorkspace";
import { useSmartWorkspace } from "@/hooks/useSmartWorkspace";
import { sortEnrichedByPersonalized } from "@/lib/personalization/smartRanking";
import {
  fixtureIdFromMatch,
  formatKickoffLabel,
  isLiveStatus,
  isFinishedStatus,
  isPreMatchStatus,
  isTerminalVisibleMatch,
  normalizeFixtureId,
} from "@/lib/ui/matchFormatting";
import { resolveTeamLogoFromMatch } from "@/lib/teams/teamLogoResolver";
import { getSafeTerminalStats } from "@/lib/terminal/validatedStats";
import { normalizeLiveMatch } from "@/lib/ui/normalizeLiveMatch";
import type { Match, MatchStatus, MatchTeamStats, Odds } from "@/types/domain";
import {
  resolveOperationalState,
  resolveOddPair,
  validationScoreFromOps,
  type OperationalState,
  type SteamDirection,
} from "@/lib/signals/executionWindow";
import { buildLiveSignals, type LiveSignalEntry } from "@/lib/signals/liveSignalBuilder";
import type { CardIntelligenceAudit } from "@/lib/terminal/cardIntelligenceAudit";
import {
  readTacticalMatch,
  type OffensiveControlSide,
  type TacticalProfile,
  type VolatilityProfile,
} from "@/lib/tactical/tacticalMatchReader";
import {
  buildMatchCardIntelligence,
  finalizeMatchCardAudit,
  operationalStateWithConfidence,
  type DataQualityLevel,
} from "@/lib/terminal/matchCardIntelligence";
import { applyTrustLayer, type TrustLevel } from "@/lib/ux/dataTrust";

export type MatchCenterFilter =
  | "all"
  | "live"
  | "upcoming"
  | "finished"
  | "high_pressure"
  | "ev_plus"
  | "execute"
  | "favorites";

export interface EnrichedLiveMatch {
  fixtureId: string;
  matchId: string;
  league: string;
  round?: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreKnown: boolean;
  minute: number | null;
  minuteLabel: string;
  status: MatchStatus | undefined;
  displayStatus: ReturnType<typeof import("@/lib/ui/matchFormatting").toDisplayStatus>;
  homeLogo: string | null;
  awayLogo: string | null;
  debug?: { scoreMissing?: boolean; fixtureMissing?: boolean };
  odds: Odds;
  pressureScore: number;
  homePressure: number;
  awayPressure: number;
  momentum: number;
  chaosIndex: number;
  edgePercent: number | null;
  ev: number | null;
  confidence: number;
  executionGrade: string | null;
  executionDecision: string | null;
  sequenceState: string | null;
  triggerWindow: string | null;
  microeventScore: number | null;
  microeventBadges: string[];
  recentEvents: string[];
  markets: { market: string; odd?: number; edge?: number; ev?: number }[];
  matchPhase: string | null;
  dominantSide: "home" | "away" | "balanced";
  xG: number;
  shots: number;
  shotsOnTarget: number;
  dangerousAttacks: number;
  corners: number;
  possession: number | null;
  teamStats?: MatchTeamStats | null;
  steamMove: boolean;
  oddsDrift: number | null;
  fairOdd: number | null;
  strongestEdgeMarket: string | null;
  evPlus: boolean;
  pressureTrend: string | null;
  premiumFeed: boolean;
  dominanceLabel: string;
  dangerousSequence: boolean;
  pressureIndex: number | null;
  trendMomentum: number;
  timelineEventsCount: number;
  /** SportMonks `trends` momentum (0–100), when present on feed. */
  sportmonksMomentum?: number | null;
  sportmonksMomentumDirection?: string | null;
  commentarySnippets?: string[];
  sportmonksTimeline?: import("@/types/domain").TimelineEventSummary[];
  homeXg?: number;
  awayXg?: number;
  advancedOddsCount?: number;
  sportmonksFeedSources?: import("@/types/domain").SportmonksFeedSources;
  operationalState: OperationalState;
  marketOdd: number | null;
  previousMarketOdd: number | null;
  steamDirection: SteamDirection;
  validationScore: number;
  urgency: number;
  isPreMatch: boolean;
  isLive: boolean;
  isFinished: boolean;
  kickoffLabel: string | null;
  startingAt?: string | null;
  startingAtTimestamp?: number | null;
  /** Narrativa principal do card (contextual por fixture). */
  cardInsight: string;
  cardInsightSecondary: string | null;
  intensityLabel: string;
  volatilityLabel: string;
  dominanceNarrative: string | null;
  dataQuality: DataQualityLevel;
  lowConfidence: boolean;
  /** Metadados de auditoria (sempre calculados; exibidos só no modo auditoria). */
  cardAudit: CardIntelligenceAudit;
  /** Leitura tática do estilo de jogo. */
  tacticalProfile: TacticalProfile;
  tacticalProfileLabel: string;
  tacticalNarrative: string;
  tacticalIntensity: number;
  offensiveControl: OffensiveControlSide;
  emotionalTemperature: number;
  transitionRisk: number;
  volatilityProfile: VolatilityProfile;
  tacticalConfidence: number;
  tacticalReasoning: string;
  tacticalLimitedReading: boolean;
  tacticalSourcesUsed: string[];
  /** Camada de confiança (pós-processamento). */
  trustLevel: TrustLevel;
  trustScore: number;
  trustLabel: string;
  trustSources: string[];
  trustVisualWeight: number;
  displayInsight: string;
  /** Engine de pressão ofensiva (worker). */
  pressureClassification?: string;
  engineMomentumScore?: number;
  engineMomentumClass?: string;
  engineTerritorialScore?: number;
  engineAccelerationScore?: number;
  engineActiveSignal?: string | null;
  evPercent?: number | null;
  evConfidence?: number | null;
  evConfidenceClass?: string | null;
  evDistortionLevel?: string | null;
  evSignalType?: string | null;
  probabilityGoal?: number | null;
  /** Operational Intelligence Layer */
  opsGameState?: string;
  opsPressurePattern?: string;
  opsTacticalScenario?: string;
  opsChaosLevel?: number;
  opsTemperature?: string;
  opsRiskContext?: string;
  opsNarrative?: string;
  opsHeadline?: string;
  opsFocusScore?: number;
  /** Learning layer */
  historicalEdgeScore?: number;
  historicalEdgeLabel?: string;
  learningBadges?: string[];
  dispatchUrgency?: string;
  dispatchPriority?: number;
  autonomousRegime?: string;
  autonomousSensitivity?: string;
  autonomousFalsePositiveRisk?: number;
  autonomousConfidence?: number;
  autonomousDispatchApproved?: boolean;
  autonomousDispatchIntensity?: string;
}

function splitPressure(
  match: Match,
  ops?: {
    homePressure: number;
    awayPressure: number;
    pressureScore: number;
    momentum: number;
  } | null
) {
  if (ops) {
    return {
      home: ops.homePressure,
      away: ops.awayPressure,
      total: ops.pressureScore,
      momentum: ops.momentum,
    };
  }
  const total = match.pressure.score;
  if (match.teamStats) {
    const h =
      match.teamStats.home.dangerousAttacks +
      match.teamStats.home.shots +
      (match.teamStats.home.totalAttacks ?? 0);
    const a =
      match.teamStats.away.dangerousAttacks +
      match.teamStats.away.shots +
      (match.teamStats.away.totalAttacks ?? 0);
    const sum = h + a || 1;
    return { home: (total * h) / sum, away: (total * a) / sum, total, momentum: 0 };
  }
  return { home: total / 2, away: total / 2, total, momentum: 0 };
}

function buildRecentEvents(parts: {
  chaosIndex: number;
  microeventScore: number | null;
  sequenceState: string | null;
  triggerWindow: string | null;
  matchPhase: string | null;
  dangerousSequence?: boolean;
}): string[] {
  const events: string[] = [];
  if (parts.matchPhase) events.push(`Fase: ${parts.matchPhase}`);
  if (parts.chaosIndex >= 65) events.push("Jogo muito aberto");
  if ((parts.microeventScore ?? 0) >= 60) events.push("Onda de ataques");
  if (parts.triggerWindow) events.push(`Momento quente (${parts.triggerWindow})`);
  if (parts.sequenceState && parts.sequenceState !== "STABLE") {
    events.push(`Ritmo: ${parts.sequenceState}`);
  }
  if (parts.dangerousSequence) events.push("Sequência perigosa");
  return events.slice(0, 5);
}

export function useLiveMatchCenter() {
  const live = useLiveMatches({ pollIntervalMs: 30_000 });
  const schedule = useTerminalSchedule(60_000);
  const ops = useOps({ pollIntervalMs: 30_000 });
  const { favorites, watched, toggleFavorite, ready: workspaceReady } = useUserWorkspace();
  const { smart } = useSmartWorkspace();
  const [filter, setFilter] = useState<MatchCenterFilter>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const dispatchByFixture = useMemo(() => {
    const snap = live.dispatchSnapshot;
    const map = new Map<
      string,
      { urgency: string; priority: number }
    >();
    if (!snap) return map;
    for (const item of [...snap.feed, ...snap.queue]) {
      map.set(item.fixtureId, {
        urgency: item.urgency,
        priority: item.priorityScore,
      });
    }
    if (snap.primaryFixtureId && !map.has(snap.primaryFixtureId)) {
      const primary = snap.feed.find((f) => f.fixtureId === snap.primaryFixtureId);
      if (primary) {
        map.set(primary.fixtureId, {
          urgency: primary.urgency,
          priority: primary.priorityScore + 10,
        });
      }
    }
    return map;
  }, [live.dispatchSnapshot]);

  const mergedMatches = useMemo(() => {
    const byFixture = new Map<string, Match>();
    for (const m of schedule.matches) {
      byFixture.set(fixtureIdFromMatch(m), m);
    }
    for (const m of live.matches) {
      const id = fixtureIdFromMatch(m);
      const prev = byFixture.get(id);
      if (!prev) {
        byFixture.set(id, m);
        continue;
      }
      byFixture.set(id, {
        ...m,
        homeLogoUrl: m.homeLogoUrl ?? prev.homeLogoUrl,
        awayLogoUrl: m.awayLogoUrl ?? prev.awayLogoUrl,
        score: m.score ?? prev.score,
        teamStats: m.teamStats ?? prev.teamStats,
        stats: (m.stats?.shots ?? 0) > 0 ? m.stats : prev.stats,
        feedMeta: prev.feedMeta
          ? {
              ...prev.feedMeta,
              participantLogos: {
                home:
                  m.feedMeta?.participantLogos?.home ??
                  m.homeLogoUrl ??
                  prev.feedMeta.participantLogos?.home ??
                  null,
                away:
                  m.feedMeta?.participantLogos?.away ??
                  m.awayLogoUrl ??
                  prev.feedMeta.participantLogos?.away ??
                  null,
              },
            }
          : m.feedMeta,
      });
    }
    return Array.from(byFixture.values());
  }, [live.matches, schedule.matches]);

  const enriched = useMemo((): EnrichedLiveMatch[] => {
    const mapped = mergedMatches.map((match) => {
      const fixtureId = fixtureIdFromMatch(match);
      const pressureOps = ops.livePressure?.metrics.find((m) => m.fixtureId === fixtureId);
      const meta = ops.metaConsensus?.consensusHeatmap.find((c) => c.fixtureId === fixtureId);
      const temporal = ops.temporal?.chaosMap.find((c) => c.fixtureId === fixtureId);
      const micro = ops.microevent?.chaosBursts.find((c) => c.fixtureId === fixtureId);
      const microTrigger = ops.microevent?.topTriggerWindows.find(
        (c) => c.fixtureId === fixtureId
      );
      const sequence = ops.sequenceMemory?.sustainedChaos.find((c) => c.fixtureId === fixtureId);
      const edges = (ops.marketCalibration?.topEdges ?? []).filter(
        (e) => e.fixtureId === fixtureId
      );
      const signal = ops.signalDecision?.activeSignals.find((s) => s.fixtureId === fixtureId);

      const split = splitPressure(match, pressureOps ?? null);
      const smMomentum =
        match.premium?.feedSources?.momentum && (match.premium.momentumScore ?? 0) > 0
          ? match.premium.momentumScore
          : null;
      const opsMomentum = pressureOps?.momentum ?? split.momentum;
      const blendedMomentum = Math.min(
        100,
        Math.round(
          smMomentum != null
            ? opsMomentum * 0.45 + smMomentum * 0.55
            : opsMomentum * 0.65 + (match.premium?.momentumScore ?? 0) * 0.35
        )
      );
      const commentarySnippets =
        match.premium?.commentary
          ?.slice(-4)
          .map((c) => c.text)
          .filter(Boolean) ?? [];
      const chaosIndex =
        match.opsIntelligence?.chaosLevel ??
        sequence?.sustainedChaosLevel ??
        temporal?.chaosIndex ??
        micro?.microeventScore ??
        0;
      const sortedEdges = [...edges].sort((a, b) => b.edgePercent - a.edgePercent);
      const topEdge = sortedEdges[0];
      const fpAlert = ops.metaConsensus?.falsePositiveAlerts.find(
        (a) => a.fixtureId === fixtureId
      );
      const staleAlert = ops.dataQuality?.staleAlerts.find(
        (a) => a.fixtureId === fixtureId
      );
      const dqRow = ops.dataQuality?.notUsableForSignal.find(
        (a) => a.fixtureId === fixtureId
      );
      const validationScore = validationScoreFromOps(
        meta?.institutionalConfidence ?? pressureOps?.confidence ?? match.pressure.score,
        dqRow ? dqRow.score : (ops.dataQuality?.averageScore ?? null),
        fpAlert?.falsePositiveRisk ?? 0,
        staleAlert?.staleRisk ?? 0
      );
      const homeP = split.home;
      const awayP = split.away;
      const dominantSide: EnrichedLiveMatch["dominantSide"] =
        homeP > awayP + 8 ? "home" : awayP > homeP + 8 ? "away" : "balanced";

      const microeventBadges: string[] = [];
      if ((micro?.microeventScore ?? 0) >= 55) microeventBadges.push("Burst");
      if ((micro?.chaosBurst ?? 0) >= 50) microeventBadges.push("Chaos wave");

      const core = normalizeLiveMatch(match, {
        opsMinute: pressureOps?.minute,
        warnContext: fixtureId,
      });

      const isPreMatch = isPreMatchStatus(core.status, core.displayStatus);
      const isLive = isLiveStatus(core.status, core.displayStatus);
      const isFinished = isFinishedStatus(core.status, core.displayStatus);
      const terminalSafeStats = getSafeTerminalStats({ teamStats: match.teamStats });

      return {
        fixtureId: core.fixtureId,
        matchId: match.id,
        league: match.league,
        isPreMatch,
        isLive,
        isFinished,
        kickoffLabel: formatKickoffLabel(
          match.startingAt,
          match.startingAtTimestamp
        ),
        startingAt: match.startingAt ?? null,
        startingAtTimestamp: match.startingAtTimestamp ?? null,
        homeTeam: core.homeTeam,
        awayTeam: core.awayTeam,
        homeScore: core.homeScore,
        awayScore: core.awayScore,
        scoreKnown: core.scoreKnown,
        minute: core.minute,
        minuteLabel: core.minuteLabel,
        status: core.status,
        displayStatus: core.displayStatus,
        homeLogo: resolveTeamLogoFromMatch(match, "home") ?? core.homeLogo,
        awayLogo: resolveTeamLogoFromMatch(match, "away") ?? core.awayLogo,
        debug: core.debug,
        odds: match.odds,
        pressureScore: split.total,
        homePressure: homeP,
        awayPressure: awayP,
        momentum: blendedMomentum,
        chaosIndex,
        edgePercent: topEdge?.edgePercent ?? null,
        ev: signal?.ev ?? topEdge?.expectedValue ?? null,
        confidence:
          meta?.institutionalConfidence ??
          pressureOps?.confidence ??
          0,
        executionGrade: meta?.executionGrade ?? null,
        executionDecision: meta?.executionDecision ?? null,
        sequenceState: sequence?.sequenceState ?? null,
        triggerWindow: microTrigger?.triggerWindow ?? null,
        microeventScore: micro?.microeventScore ?? null,
        microeventBadges,
        recentEvents: buildRecentEvents({
          chaosIndex,
          microeventScore: micro?.microeventScore ?? null,
          sequenceState: sequence?.sequenceState ?? null,
          triggerWindow: microTrigger?.triggerWindow ?? null,
          matchPhase: temporal?.matchPhase ?? null,
          dangerousSequence: match.premium?.dangerousSequence ?? false,
        }),
        markets:
          (match.oddsQuotes?.length ?? 0) > 0
            ? match.oddsQuotes!.map((q) => {
                const edgeRow = sortedEdges.find(
                  (e) =>
                    e.market === q.marketCode ||
                    e.market.includes(String(q.marketCode).replace(/_/g, ""))
                );
                return {
                  market: q.marketName,
                  odd: q.odd,
                  edge: edgeRow?.edgePercent,
                  ev: edgeRow?.expectedValue,
                };
              })
            : [
                {
                  market: "Over 0.5",
                  odd: match.odds.over05,
                  edge: sortedEdges.find((e) => e.market.includes("0.5"))?.edgePercent,
                },
                {
                  market: "Over 1.5",
                  odd: match.odds.over15,
                  edge: sortedEdges.find((e) => e.market.includes("1.5"))?.edgePercent,
                },
                ...sortedEdges.slice(0, 3).map((e) => ({
                  market: e.market,
                  odd: e.marketOdd,
                  edge: e.edgePercent,
                  ev: e.expectedValue,
                })),
              ],
        matchPhase: temporal?.matchPhase ?? null,
        dominantSide,
        xG: match.stats.xG ?? 0,
        homeXg: match.premium?.xgHome,
        awayXg: match.premium?.xgAway,
        sportmonksMomentum: smMomentum,
        sportmonksMomentumDirection: match.premium?.momentumDirection ?? null,
        commentarySnippets,
        sportmonksTimeline: match.premium?.timelineEvents,
        advancedOddsCount: match.premium?.advancedOddsCount,
        sportmonksFeedSources: match.premium?.feedSources ?? match.feedMeta?.sportmonksSources,
        shots: terminalSafeStats.totalShots ?? 0,
        shotsOnTarget: terminalSafeStats.totalShotsOnTarget ?? 0,
        dangerousAttacks: terminalSafeStats.totalDangerousAttacks ?? 0,
        corners: terminalSafeStats.totalCorners ?? 0,
        possession: terminalSafeStats.possessionHome,
        teamStats: match.teamStats ?? null,
        steamMove: topEdge?.steamMove ?? false,
        oddsDrift: topEdge?.oddsDrift ?? null,
        fairOdd: topEdge?.fairOdd ?? null,
        strongestEdgeMarket: topEdge?.market ?? null,
        evPlus:
          topEdge?.classification === "EV_PLUS" ||
          topEdge?.classification === "STRONG_EDGE" ||
          topEdge?.classification === "INSTITUTIONAL_EDGE" ||
          (topEdge?.expectedValue ?? 0) > 0.01,
        pressureTrend: match.pressure.trend ?? match.feedMeta?.pressureTrend ?? null,
        premiumFeed:
          match.feedMeta?.premiumStatsActive ??
          match.feedMeta?.hasInplayOdds ??
          (match.stats.xG ?? 0) > 0,
        dominanceLabel: match.premium?.dominanceLabel ?? "BALANCED",
        dangerousSequence:
          match.premium?.dangerousSequence ??
          (sequence?.sequenceState?.toUpperCase().includes("CHAOS") ?? false),
        pressureIndex: match.premium?.pressureIndex ?? null,
        trendMomentum: smMomentum ?? match.premium?.momentumScore ?? split.momentum,
        timelineEventsCount: match.premium?.timelineEventsCount ?? 0,
        marketOdd: topEdge?.marketOdd ?? match.odds.primary ?? null,
        previousMarketOdd: (() => {
          const pair = resolveOddPair(
            topEdge?.marketOdd ?? match.odds.primary,
            topEdge?.oddsDrift ?? null
          );
          return pair.previousOdd;
        })(),
        steamDirection: (() => {
          const drift = topEdge?.oddsDrift ?? null;
          if (drift == null || Math.abs(drift) < 0.02) return "FLAT" as const;
          return drift < 0 ? ("DOWN" as const) : ("UP" as const);
        })(),
        validationScore,
        urgency: 0,
        operationalState: "WAIT" as OperationalState,
        cardInsight: "",
        cardInsightSecondary: null,
        intensityLabel: "",
        volatilityLabel: "",
        dominanceNarrative: null,
        dataQuality: "sparse" as DataQualityLevel,
        lowConfidence: true,
        cardAudit: {
          sourcesUsed: [],
          missingFields: ["intel"],
          fallbacksUsed: [],
          insightReason: "aguardando inteligência",
          confidenceReason: "—",
          operationalStateReason: "—",
          pressureReason: "—",
          rawOperationalState: "WAIT" as OperationalState,
          finalOperationalState: "WAIT" as OperationalState,
        },
        tacticalProfile: "LOW_DATA" as TacticalProfile,
        tacticalProfileLabel: "Leitura limitada",
        tacticalNarrative: "",
        tacticalIntensity: 0,
        offensiveControl: "NEUTRAL" as OffensiveControlSide,
        emotionalTemperature: 0,
        transitionRisk: 0,
        volatilityProfile: "STABLE" as VolatilityProfile,
        tacticalConfidence: 0,
        tacticalReasoning: "",
        tacticalLimitedReading: true,
        tacticalSourcesUsed: [],
        trustLevel: "limited" as TrustLevel,
        trustScore: 0,
        trustLabel: "Leitura limitada",
        trustSources: [],
        trustVisualWeight: 0.35,
        displayInsight: "",
      };
    }).map((row) => {
      const match = live.matches.find((m) => fixtureIdFromMatch(m) === row.fixtureId);
      if (!match) return row;

      const pressureOpsRow = ops.livePressure?.metrics.find(
        (m) => m.fixtureId === row.fixtureId
      );

      const { intel, auditDraft } = buildMatchCardIntelligence({
        match,
        fixtureId: row.fixtureId,
        isLive: row.isLive,
        isPreMatch: row.isPreMatch,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        scoreKnown: row.scoreKnown,
        minute: row.minute,
        opsPressure: pressureOpsRow
          ? {
              homePressure: row.homePressure,
              awayPressure: row.awayPressure,
              pressureScore: row.pressureScore,
              momentum: row.momentum,
              confidence: pressureOpsRow.confidence,
            }
          : null,
        chaosFromOps: row.chaosIndex,
        sequenceState: row.sequenceState,
        temporalPhase: row.matchPhase,
        microeventScore: row.microeventScore,
        topEdge: row.edgePercent != null
          ? {
              edgePercent: row.edgePercent,
              steamMove: row.steamMove,
              oddsDrift: row.oddsDrift,
              fairOdd: row.fairOdd,
              marketOdd: row.marketOdd,
            }
          : null,
        metaConfidence:
          ops.metaConsensus?.consensusHeatmap.find((c) => c.fixtureId === row.fixtureId)
            ?.institutionalConfidence ?? null,
        validationScore: row.validationScore,
        premiumFeed: row.premiumFeed,
        hasTeamStats: !!match.teamStats,
        dominanceLabel: row.dominanceLabel,
        fpRisk:
          ops.metaConsensus?.falsePositiveAlerts.find(
            (a) => a.fixtureId === row.fixtureId
          )?.falsePositiveRisk ?? 0,
        staleRisk:
          ops.dataQuality?.staleAlerts.find((a) => a.fixtureId === row.fixtureId)
            ?.staleRisk ?? 0,
        steamDirection: row.steamDirection,
      });

      const window = resolveOperationalState({
        edgePercent: intel.edgePercent ?? 0,
        confidence: intel.confidence,
        chaos: intel.chaosIndex,
        pressureScore: intel.pressureScore,
        momentum: intel.momentum,
        steamMove: row.steamMove,
        oddsDrift: row.oddsDrift,
        validationScore: row.validationScore,
        falsePositiveRisk:
          ops.metaConsensus?.falsePositiveAlerts.find(
            (a) => a.fixtureId === row.fixtureId
          )?.falsePositiveRisk ?? 0,
        evPlus: row.evPlus,
        executionDecision: row.executionDecision,
      });

      const operationalState = operationalStateWithConfidence(
        window.state,
        intel.lowConfidence,
        intel.dataQuality
      );

      const stateAdjustedForConfidence = window.state !== operationalState;
      const cardAudit = finalizeMatchCardAudit(auditDraft, {
        rawOperationalState: window.state,
        finalOperationalState: operationalState,
        stateAdjustedForConfidence,
      });

      const tactical = readTacticalMatch({
        match,
        fixtureId: row.fixtureId,
        isLive: row.isLive,
        isPreMatch: row.isPreMatch,
        minute: row.minute,
        homeScore: row.homeScore,
        awayScore: row.awayScore,
        scoreKnown: row.scoreKnown,
        homePressure: intel.homePressure,
        awayPressure: intel.awayPressure,
        pressureScore: intel.pressureScore,
        momentum: intel.momentum,
        chaosIndex: intel.chaosIndex,
        pressureTrend: match.pressure.trend ?? match.feedMeta?.pressureTrend ?? null,
        steamMove: row.steamMove,
        oddsDrift: row.oddsDrift,
        steamDirection: row.steamDirection,
        edgePercent: intel.edgePercent,
        sequenceState: row.sequenceState,
        dominanceLabel: row.dominanceLabel,
      });

      return {
        ...row,
        pressureScore: intel.pressureScore,
        homePressure: intel.homePressure,
        awayPressure: intel.awayPressure,
        momentum: intel.momentum,
        chaosIndex: intel.chaosIndex,
        confidence: intel.confidence,
        edgePercent: intel.edgePercent,
        cardInsight: intel.primaryInsight,
        cardInsightSecondary: intel.secondaryInsight,
        intensityLabel: intel.intensityLabel,
        volatilityLabel: intel.volatilityLabel,
        dominanceNarrative: intel.dominanceNarrative,
        dataQuality: intel.dataQuality,
        lowConfidence: intel.lowConfidence,
        cardAudit,
        tacticalProfile: tactical.tacticalProfile,
        tacticalProfileLabel: tactical.profileLabel,
        tacticalNarrative: tactical.tacticalNarrative,
        tacticalIntensity: tactical.tacticalIntensity,
        offensiveControl: tactical.offensiveControl,
        emotionalTemperature: tactical.emotionalTemperature,
        transitionRisk: tactical.transitionRisk,
        volatilityProfile: tactical.volatilityProfile,
        tacticalConfidence: tactical.confidence,
        tacticalReasoning: tactical.reasoning,
        tacticalLimitedReading: tactical.limitedReading,
        tacticalSourcesUsed: tactical.sourcesUsed,
        operationalState,
        urgency: window.urgency,
        steamDirection: window.steamDirection,
        trustLevel: "limited" as TrustLevel,
        trustScore: 0,
        trustLabel: "Leitura limitada",
        trustSources: [],
        trustVisualWeight: 0.35,
        displayInsight:
          match.opsIntelligence?.narrative ?? intel.primaryInsight,
        pressureClassification: match.feedMeta?.offensiveEngine?.classification,
        engineMomentumScore: match.feedMeta?.offensiveEngine?.momentumScore,
        engineMomentumClass: match.feedMeta?.offensiveEngine?.momentumClass,
        engineTerritorialScore: match.feedMeta?.offensiveEngine?.territorialScore,
        engineAccelerationScore: match.feedMeta?.offensiveEngine?.accelerationScore,
        engineActiveSignal: match.feedMeta?.offensiveEngine?.activeSignals?.[0] ?? null,
        fairOdd:
          match.evEngine?.expectedValue.best?.fairOdds ??
          row.fairOdd ??
          null,
        marketOdd:
          match.evEngine?.expectedValue.best?.marketOdds ??
          row.marketOdd ??
          null,
        evPercent:
          match.evEngine?.expectedValue.best?.evPercent ??
          match.evEngine?.expectedValue.over05.evPercent ??
          null,
        evConfidence: match.evEngine?.confidence.score ?? null,
        evConfidenceClass: match.evEngine?.confidence.class ?? null,
        evDistortionLevel: match.evEngine?.distortion.level ?? null,
        evSignalType: match.evEngine?.rankedSignals[0]?.signalType ?? null,
        probabilityGoal: match.evEngine?.probabilityGoal ?? null,
        opsGameState: match.opsIntelligence?.gameState,
        opsPressurePattern: match.opsIntelligence?.pressurePattern,
        opsTacticalScenario: match.opsIntelligence?.tacticalScenario,
        opsChaosLevel: match.opsIntelligence?.chaosLevel,
        opsTemperature: match.opsIntelligence?.temperature,
        opsRiskContext: match.opsIntelligence?.riskContext,
        opsNarrative: match.opsIntelligence?.narrative,
        opsHeadline: match.opsIntelligence?.headline,
        opsFocusScore: match.opsIntelligence?.focusScore,
        historicalEdgeScore: match.learningContext?.historicalEdge.score,
        historicalEdgeLabel: match.learningContext?.historicalEdge.label,
        learningBadges: match.learningContext?.historicalEdge.badges,
        dispatchUrgency: dispatchByFixture.get(row.fixtureId)?.urgency,
        dispatchPriority: dispatchByFixture.get(row.fixtureId)?.priority,
        autonomousRegime: match.autonomousProfile?.marketRegime,
        autonomousSensitivity: match.autonomousProfile?.sensitivity,
        autonomousFalsePositiveRisk: match.autonomousProfile?.falsePositiveRisk,
        autonomousConfidence: match.autonomousProfile?.autonomousConfidence,
        autonomousDispatchApproved: match.autonomousProfile?.dispatchApproved,
        autonomousDispatchIntensity: match.autonomousProfile?.dispatchIntensity,
      };
    });

    const sorted = [...mapped].sort((a, b) => {
      if (a.isLive !== b.isLive) return a.isLive ? -1 : 1;
      if (a.isPreMatch !== b.isPreMatch) return a.isPreMatch ? 1 : -1;
      return b.pressureScore - a.pressureScore;
    });

    return applyTrustLayer(sorted);
  }, [mergedMatches, ops, dispatchByFixture]);

  const liveSignals = useMemo(
    (): LiveSignalEntry[] =>
      buildLiveSignals(enriched, ops.marketCalibration),
    [enriched, ops.marketCalibration]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = enriched.filter((m) => {
      if (q) {
        const hay = `${m.homeTeam} ${m.awayTeam} ${m.league}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      switch (filter) {
        case "live":
          return m.isLive;
        case "upcoming":
          return m.isPreMatch;
        case "finished":
          return m.isFinished;
        case "high_pressure":
          return m.isLive && m.pressureScore >= 70;
        case "ev_plus":
          return (m.ev ?? 0) >= 0.03 || (m.edgePercent ?? 0) >= 3;
        case "execute":
          return (
            m.operationalState === "EXECUTE" ||
            (m.executionDecision ?? "").toUpperCase() === "EXECUTE" ||
            (m.executionDecision ?? "").toUpperCase() === "AGGRESSIVE_EXECUTE"
          );
        case "favorites":
          return favorites.has(m.fixtureId);
        default:
          return isTerminalVisibleMatch(m.status, m.displayStatus);
      }
    });
    return sortEnrichedByPersonalized(list, smart, favorites, watched);
  }, [enriched, filter, search, favorites, watched, smart]);

  const kpis = useMemo(
    () => ({
      tracked: enriched.length,
      live: enriched.filter((m) => m.isLive).length,
      upcoming: enriched.filter((m) => m.isPreMatch).length,
      finished: enriched.filter((m) => m.isFinished).length,
      signals: ops.signalDecision?.activeSignals.length ?? live.signals.length,
      execute: enriched.filter((m) => m.operationalState === "EXECUTE").length,
    }),
    [enriched, ops, live.signals.length]
  );

  return {
    matches: filtered,
    allMatches: enriched,
    liveSignals,
    kpis,
    filter,
    setFilter,
    search,
    setSearch,
    viewMode,
    setViewMode,
    favorites,
    toggleFavorite,
    workspaceReady,
    feedStatus: live.status,
    opsStatus: ops.status,
    lastUpdated: live.lastUpdated,
    source: live.source,
    dataSourceBadge: live.dataSourceBadge,
    feedError: live.error,
    sportmonksError: live.sportmonksError,
    isEmpty: live.isEmpty,
    responseTime: live.responseTime,
    isLoading: live.isInitialLoad && schedule.loading,
    autonomousSnapshot: live.autonomousSnapshot,
    normalizeFixtureId,
  };
}
