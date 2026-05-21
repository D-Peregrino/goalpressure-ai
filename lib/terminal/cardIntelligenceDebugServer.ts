/**
 * Monta relatório de inteligência por card no servidor (debug API).
 * Reutiliza a mesma síntese do terminal — não altera runtime.
 */

import {
  fixtureIdFromMatch,
  isLiveStatus,
  isPreMatchStatus,
} from "@/lib/ui/matchFormatting";
import { normalizeLiveMatch } from "@/lib/ui/normalizeLiveMatch";
import type { Match } from "@/types/domain";
import type { OpsApiResponse } from "@/types/opsApi";
import {
  resolveOperationalState,
  validationScoreFromOps,
  type SteamDirection,
} from "@/lib/signals/executionWindow";
import {
  auditToDebugEntry,
  type CardIntelligenceDebugEntry,
} from "@/lib/terminal/cardIntelligenceAudit";
import {
  buildMatchCardIntelligence,
  finalizeMatchCardAudit,
  operationalStateWithConfidence,
} from "@/lib/terminal/matchCardIntelligence";

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

function matchLabel(home: string, away: string): string {
  return `${home} x ${away}`;
}

export function buildCardIntelligenceDebugReport(
  matches: Match[],
  ops: OpsApiResponse
): CardIntelligenceDebugEntry[] {
  if (!("ok" in ops) || ops.ok !== true) return [];

  const entries: CardIntelligenceDebugEntry[] = [];

  for (const match of matches) {
    const fixtureId = fixtureIdFromMatch(match);
    const pressureOps = ops.livePressure?.metrics.find((m) => m.fixtureId === fixtureId);
    const meta = ops.metaConsensus?.consensusHeatmap.find((c) => c.fixtureId === fixtureId);
    const temporal = ops.temporal?.chaosMap.find((c) => c.fixtureId === fixtureId);
    const micro = ops.microevent?.chaosBursts.find((c) => c.fixtureId === fixtureId);
    const sequence = ops.sequenceMemory?.sustainedChaos.find((c) => c.fixtureId === fixtureId);
    const edges = (ops.marketCalibration?.topEdges ?? []).filter(
      (e) => e.fixtureId === fixtureId
    );
    const sortedEdges = [...edges].sort((a, b) => b.edgePercent - a.edgePercent);
    const topEdge = sortedEdges[0];
    const fpAlert = ops.metaConsensus?.falsePositiveAlerts.find(
      (a) => a.fixtureId === fixtureId
    );
    const staleAlert = ops.dataQuality?.staleAlerts.find((a) => a.fixtureId === fixtureId);
    const dqRow = ops.dataQuality?.notUsableForSignal.find((a) => a.fixtureId === fixtureId);

    const split = splitPressure(match, pressureOps ?? null);
    const chaosIndex =
      sequence?.sustainedChaosLevel ?? temporal?.chaosIndex ?? micro?.microeventScore ?? 0;
    const validationScore = validationScoreFromOps(
      meta?.institutionalConfidence ?? pressureOps?.confidence ?? match.pressure.score,
      dqRow ? dqRow.score : (ops.dataQuality?.averageScore ?? null),
      fpAlert?.falsePositiveRisk ?? 0,
      staleAlert?.staleRisk ?? 0
    );

    const core = normalizeLiveMatch(match, {
      opsMinute: pressureOps?.minute,
      warnContext: fixtureId,
    });
    const isPreMatch = isPreMatchStatus(core.status, core.displayStatus);
    const isLive = isLiveStatus(core.status, core.displayStatus);
    const steamMove = topEdge?.steamMove ?? false;
    const oddsDrift = topEdge?.oddsDrift ?? null;
    const steamDirection: SteamDirection = (() => {
      if (oddsDrift == null || Math.abs(oddsDrift) < 0.02) return "FLAT";
      return oddsDrift < 0 ? "DOWN" : "UP";
    })();
    const evPlus =
      topEdge?.classification === "EV_PLUS" ||
      topEdge?.classification === "STRONG_EDGE" ||
      topEdge?.classification === "INSTITUTIONAL_EDGE" ||
      (topEdge?.expectedValue ?? 0) > 0.01;

    const { intel, auditDraft } = buildMatchCardIntelligence({
      match,
      fixtureId,
      isLive,
      isPreMatch,
      homeScore: core.homeScore,
      awayScore: core.awayScore,
      scoreKnown: core.scoreKnown,
      minute: core.minute,
      opsPressure: pressureOps
        ? {
            homePressure: split.home,
            awayPressure: split.away,
            pressureScore: split.total,
            momentum: pressureOps.momentum,
            confidence: pressureOps.confidence,
          }
        : null,
      chaosFromOps: chaosIndex,
      sequenceState: sequence?.sequenceState ?? null,
      temporalPhase: temporal?.matchPhase ?? null,
      microeventScore: micro?.microeventScore ?? null,
      topEdge: topEdge
        ? {
            edgePercent: topEdge.edgePercent,
            steamMove,
            oddsDrift,
            fairOdd: topEdge.fairOdd,
            marketOdd: topEdge.marketOdd,
          }
        : null,
      metaConfidence: meta?.institutionalConfidence ?? null,
      validationScore,
      premiumFeed:
        match.feedMeta?.premiumStatsActive ??
        match.feedMeta?.hasInplayOdds ??
        (match.stats.xG ?? 0) > 0,
      hasTeamStats: !!match.teamStats,
      dominanceLabel: match.premium?.dominanceLabel ?? "BALANCED",
      fpRisk: fpAlert?.falsePositiveRisk ?? 0,
      staleRisk: staleAlert?.staleRisk ?? 0,
      steamDirection,
    });

    const window = resolveOperationalState({
      edgePercent: intel.edgePercent ?? 0,
      confidence: intel.confidence,
      chaos: intel.chaosIndex,
      pressureScore: intel.pressureScore,
      momentum: intel.momentum,
      steamMove,
      oddsDrift,
      validationScore,
      falsePositiveRisk: fpAlert?.falsePositiveRisk ?? 0,
      evPlus,
      executionDecision: meta?.executionDecision ?? null,
    });

    const finalState = operationalStateWithConfidence(
      window.state,
      intel.lowConfidence,
      intel.dataQuality
    );

    const audit = finalizeMatchCardAudit(auditDraft, {
      rawOperationalState: window.state,
      finalOperationalState: finalState,
      stateAdjustedForConfidence: window.state !== finalState,
    });

    entries.push(
      auditToDebugEntry(
        fixtureId,
        matchLabel(core.homeTeam, core.awayTeam),
        { ...intel, audit },
        finalState
      )
    );

  }

  return entries;
}
