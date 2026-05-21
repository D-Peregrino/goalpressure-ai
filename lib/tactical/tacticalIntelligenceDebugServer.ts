/**
 * Relatório tático no servidor — debug API, mesma leitura do terminal.
 */

import { fixtureIdFromMatch, isLiveStatus, isPreMatchStatus } from "@/lib/ui/matchFormatting";
import { normalizeLiveMatch } from "@/lib/ui/normalizeLiveMatch";
import type { Match } from "@/types/domain";
import type { OpsApiResponse } from "@/types/opsApi";
import type { SteamDirection } from "@/lib/signals/executionWindow";
import {
  readTacticalMatch,
  tacticalToDebugEntry,
  type TacticalIntelligenceDebugEntry,
} from "@/lib/tactical/tacticalMatchReader";

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

export function buildTacticalIntelligenceDebugReport(
  matches: Match[],
  ops: OpsApiResponse
): TacticalIntelligenceDebugEntry[] {
  if (!("ok" in ops) || ops.ok !== true) return [];

  const entries: TacticalIntelligenceDebugEntry[] = [];

  for (const match of matches) {
    const fixtureId = fixtureIdFromMatch(match);
    const pressureOps = ops.livePressure?.metrics.find((m) => m.fixtureId === fixtureId);
    const temporal = ops.temporal?.chaosMap.find((c) => c.fixtureId === fixtureId);
    const micro = ops.microevent?.chaosBursts.find((c) => c.fixtureId === fixtureId);
    const sequence = ops.sequenceMemory?.sustainedChaos.find((c) => c.fixtureId === fixtureId);
    const edges = (ops.marketCalibration?.topEdges ?? []).filter(
      (e) => e.fixtureId === fixtureId
    );
    const sortedEdges = [...edges].sort((a, b) => b.edgePercent - a.edgePercent);
    const topEdge = sortedEdges[0];

    const split = splitPressure(match, pressureOps ?? null);
    const chaosIndex =
      sequence?.sustainedChaosLevel ?? temporal?.chaosIndex ?? micro?.microeventScore ?? 0;
    const blendedMomentum = Math.min(
      100,
      Math.round(
        (pressureOps?.momentum ?? split.momentum) * 0.65 +
          (match.premium?.momentumScore ?? 0) * 0.35
      )
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

    const intel = readTacticalMatch({
      match,
      fixtureId,
      isLive,
      isPreMatch,
      minute: core.minute,
      homeScore: core.homeScore,
      awayScore: core.awayScore,
      scoreKnown: core.scoreKnown,
      homePressure: split.home,
      awayPressure: split.away,
      pressureScore: split.total,
      momentum: blendedMomentum,
      chaosIndex,
      pressureTrend: match.pressure.trend ?? match.feedMeta?.pressureTrend ?? null,
      steamMove,
      oddsDrift,
      steamDirection,
      edgePercent: topEdge?.edgePercent ?? null,
      sequenceState: sequence?.sequenceState ?? null,
      dominanceLabel: match.premium?.dominanceLabel ?? "BALANCED",
    });

    entries.push(
      tacticalToDebugEntry(
        fixtureId,
        matchLabel(core.homeTeam, core.awayTeam),
        intel,
        isPreMatch ? "pre" : isLive ? "live" : "other"
      )
    );
  }

  return entries;
}
