"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMatchIntel } from "@/hooks/useMatchIntel";
import { normalizeLiveMatch } from "@/lib/ui/normalizeLiveMatch";
import { buildQuantTimeline } from "@/lib/match/buildQuantTimeline";
import { pickBestExecution } from "@/lib/match/pickBestExecution";
import {
  resolveOperationalState,
  resolveOddPair,
  validationScoreFromOps,
} from "@/lib/signals/executionWindow";
import { useOps } from "@/hooks/useOps";
import {
  buildTacticalForFixture,
  splitPressureFromMatch,
} from "@/lib/tactical/buildTacticalForFixture";
import {
  isLiveStatus,
  isPreMatchStatus,
} from "@/lib/ui/matchFormatting";
import type { MatchStoryVisualInput } from "@/lib/match/matchStoryVisual";
import { buildStoryChapters } from "@/lib/match/matchStoryVisual";

const PRESSURE_HISTORY_MAX = 36;

export function useMatchCenter(fixtureId: string) {
  const intel = useMatchIntel(fixtureId);
  const ops = useOps();
  const [pressureHistory, setPressureHistory] = useState<number[]>([]);

  const fpAlert = useMemo(
    () =>
      ops.metaConsensus?.falsePositiveAlerts.find(
        (a) => a.fixtureId === intel.fixtureId
      ),
    [ops.metaConsensus, intel.fixtureId]
  );

  const staleAlert = useMemo(
    () =>
      ops.dataQuality?.staleAlerts.find((a) => a.fixtureId === intel.fixtureId),
    [ops.dataQuality, intel.fixtureId]
  );

  const dqRow = useMemo(
    () =>
      ops.dataQuality?.notUsableForSignal.find(
        (a) => a.fixtureId === intel.fixtureId
      ),
    [ops.dataQuality, intel.fixtureId]
  );

  const territorial = useMemo(
    () =>
      ops.microevent?.territorialPressure.find(
        (t) => t.fixtureId === intel.fixtureId
      ),
    [ops.microevent, intel.fixtureId]
  );

  const attackWave = useMemo(
    () =>
      ops.microevent?.attackWaves.find((a) => a.fixtureId === intel.fixtureId),
    [ops.microevent, intel.fixtureId]
  );

  const sortedEdges = useMemo(
    () => [...intel.edges].sort((a, b) => b.edgePercent - a.edgePercent),
    [intel.edges]
  );

  const topEdge = sortedEdges[0];

  const chaosIndex = useMemo(
    () =>
      intel.sequence?.sustainedChaosLevel ??
      intel.temporal?.chaosIndex ??
      intel.microevent?.microeventScore ??
      0,
    [intel.sequence, intel.temporal, intel.microevent]
  );

  const momentum = useMemo(() => {
    const base = intel.pressure?.momentum ?? 0;
    const prem = intel.match?.premium?.momentumScore ?? 0;
    return Math.min(100, Math.round(base * 0.65 + prem * 0.35));
  }, [intel.pressure, intel.match]);

  const validationScore = useMemo(
    () =>
      validationScoreFromOps(
        intel.meta?.institutionalConfidence ??
          intel.pressure?.confidence ??
          intel.match?.pressure.score ??
          0,
        dqRow ? dqRow.score : (ops.dataQuality?.averageScore ?? null),
        fpAlert?.falsePositiveRisk ?? 0,
        staleAlert?.staleRisk ?? 0
      ),
    [intel.meta, intel.pressure, intel.match, dqRow, ops.dataQuality, fpAlert, staleAlert]
  );

  const operational = useMemo(() => {
    if (!intel.match) {
      return {
        state: "WAIT" as const,
        urgency: 0,
        steamDirection: "FLAT" as const,
      };
    }
    return resolveOperationalState({
      edgePercent: topEdge?.edgePercent ?? 0,
      confidence:
        intel.meta?.institutionalConfidence ??
        intel.pressure?.confidence ??
        intel.match.pressure.score,
      chaos: chaosIndex,
      pressureScore: intel.pressure?.pressureScore ?? intel.match.pressure.score,
      momentum,
      steamMove: topEdge?.steamMove ?? false,
      oddsDrift: topEdge?.oddsDrift ?? null,
      validationScore,
      falsePositiveRisk: fpAlert?.falsePositiveRisk ?? 0,
      evPlus:
        topEdge?.classification === "EV_PLUS" ||
        topEdge?.classification === "STRONG_EDGE" ||
        topEdge?.classification === "INSTITUTIONAL_EDGE" ||
        (topEdge?.expectedValue ?? 0) > 0.01,
      executionDecision: intel.meta?.executionDecision,
    });
  }, [
    intel.match,
    intel.meta,
    intel.pressure,
    topEdge,
    chaosIndex,
    momentum,
    validationScore,
    fpAlert,
  ]);

  const bestExecution = useMemo(() => {
    if (!intel.match) return null;
    return pickBestExecution(sortedEdges, {
      edgePercent: topEdge?.edgePercent ?? 0,
      confidence:
        intel.meta?.institutionalConfidence ??
        intel.pressure?.confidence ??
        intel.match.pressure.score,
      chaos: chaosIndex,
      pressureScore: intel.pressure?.pressureScore ?? intel.match.pressure.score,
      momentum,
      validationScore,
      falsePositiveRisk: fpAlert?.falsePositiveRisk ?? 0,
      executionDecision: intel.meta?.executionDecision,
      evPlus: operational.urgency > 70,
    });
  }, [
    intel.match,
    intel.meta,
    intel.pressure,
    sortedEdges,
    topEdge,
    chaosIndex,
    momentum,
    validationScore,
    fpAlert,
    operational.urgency,
  ]);

  const core = useMemo(() => {
    if (!intel.match) return null;
    return normalizeLiveMatch(intel.match, {
      opsMinute: intel.pressure?.minute,
      warnContext: intel.fixtureId,
    });
  }, [intel.match, intel.pressure, intel.fixtureId]);

  const timeline = useMemo(() => {
    if (!intel.match) return [];
    return buildQuantTimeline({
      minute: intel.match.minute,
      premiumEvents: intel.match.premium?.timelineEvents,
      pressureScore: intel.pressure?.pressureScore ?? intel.match.pressure.score,
      chaosIndex,
      steamMove: topEdge?.steamMove ?? false,
      oddsDrift: topEdge?.oddsDrift ?? null,
      operationalState: operational.state,
      sequenceState: intel.sequence?.sequenceState,
      triggerWindow: ops.microevent?.topTriggerWindows.find(
        (t) => t.fixtureId === intel.fixtureId
      )?.triggerWindow,
      microeventScore: intel.microevent?.microeventScore,
      topEdgeMarket: topEdge?.market,
      topEdgePercent: topEdge?.edgePercent,
    });
  }, [
    intel.match,
    intel.pressure,
    intel.sequence,
    intel.microevent,
    intel.fixtureId,
    ops.microevent,
    chaosIndex,
    topEdge,
    operational.state,
  ]);

  const oddsQuotes = useMemo(() => {
    const m = intel.match;
    if (!m) return [];
    if (m.oddsQuotes?.length) return m.oddsQuotes;
    return sortedEdges.map((e) => {
      const pair = resolveOddPair(e.marketOdd, e.oddsDrift ?? null);
      return {
        marketCode: e.market,
        marketName: e.market.replace(/_/g, " "),
        odd: pair.currentOdd ?? e.marketOdd ?? 1,
        impliedProbability: 0,
        label: e.market,
        bookmakerId: 2,
        bookmakerName: "bet365",
        marketId: null,
        line: null,
        capturedAt: new Date().toISOString(),
      };
    });
  }, [intel.match, sortedEdges]);

  const tactical = useMemo(() => {
    if (!intel.match || !core) return null;
    const split = splitPressureFromMatch(intel.match, intel.pressure);
    const isPreMatch = isPreMatchStatus(core.status, core.displayStatus);
    const isLive = isLiveStatus(core.status, core.displayStatus);
    const steamMove = topEdge?.steamMove ?? false;
    const oddsDrift = topEdge?.oddsDrift ?? null;
    const steamDirection = (() => {
      if (oddsDrift == null || Math.abs(oddsDrift) < 0.02) return "FLAT" as const;
      return oddsDrift < 0 ? ("DOWN" as const) : ("UP" as const);
    })();

    return buildTacticalForFixture({
      match: intel.match,
      fixtureId: intel.fixtureId,
      isLive,
      isPreMatch,
      minute: core.minute,
      homeScore: core.homeScore,
      awayScore: core.awayScore,
      scoreKnown: core.scoreKnown,
      homePressure: split.home,
      awayPressure: split.away,
      pressureScore: split.total,
      momentum,
      chaosIndex,
      pressureTrend: intel.match.pressure.trend ?? intel.match.feedMeta?.pressureTrend ?? null,
      steamMove,
      oddsDrift,
      steamDirection,
      edgePercent: topEdge?.edgePercent ?? null,
      sequenceState: intel.sequence?.sequenceState ?? null,
      dominanceLabel: intel.match.premium?.dominanceLabel ?? "BALANCED",
    });
  }, [intel.match, intel.fixtureId, intel.pressure, intel.sequence, core, momentum, chaosIndex, topEdge]);

  const storyVisualInput = useMemo((): MatchStoryVisualInput | null => {
    if (!intel.match || !tactical) return null;
    const split = splitPressureFromMatch(intel.match, intel.pressure);
    return {
      tacticalProfile: tactical.tacticalProfile,
      tacticalNarrative: tactical.tacticalNarrative,
      tacticalIntensity: tactical.tacticalIntensity,
      emotionalTemperature: tactical.emotionalTemperature,
      transitionRisk: tactical.transitionRisk,
      volatilityProfile: tactical.volatilityProfile,
      offensiveControl: tactical.offensiveControl,
      confidence: tactical.confidence,
      homeTeam: intel.match.homeTeam,
      awayTeam: intel.match.awayTeam,
      homePressure: split.home,
      awayPressure: split.away,
      momentum,
      isPreMatch: core
        ? isPreMatchStatus(core.status, core.displayStatus)
        : false,
    };
  }, [intel.match, intel.pressure, tactical, momentum, core]);

  const storyChapters = useMemo(() => {
    if (!intel.match || !tactical || !core) return [];
    const hist = pressureHistory;
    const pressureRising =
      hist.length >= 2 ? hist[hist.length - 1]! > hist[hist.length - 2]! + 2 : false;
    const hasGoals =
      core.scoreKnown &&
      (core.homeScore ?? 0) + (core.awayScore ?? 0) > 0;
    return buildStoryChapters(intel.match.minute, {
      hasGoals,
      steamMove: topEdge?.steamMove ?? false,
      pressureRising,
      profile: tactical.tacticalProfile,
      homeLeading:
        core.scoreKnown &&
        (core.homeScore ?? 0) > (core.awayScore ?? 0),
      awayLeading:
        core.scoreKnown &&
        (core.awayScore ?? 0) > (core.homeScore ?? 0),
    });
  }, [intel.match, tactical, core, pressureHistory, topEdge]);

  const pressureRef = useRef(0);
  useEffect(() => {
    const p = intel.pressure?.pressureScore ?? intel.match?.pressure.score;
    if (p == null || p === pressureRef.current) return;
    pressureRef.current = p;
    setPressureHistory((prev) => [...prev, p].slice(-PRESSURE_HISTORY_MAX));
  }, [intel.pressure, intel.match]);

  return {
    ...intel,
    core,
    sortedEdges,
    topEdge,
    chaosIndex,
    momentum,
    validationScore,
    operational,
    bestExecution,
    timeline,
    oddsQuotes,
    pressureHistory,
    territorial,
    attackWave,
    xg: intel.match?.stats.xG ?? 0,
    tactical,
    storyVisualInput,
    storyChapters,
  };
}
