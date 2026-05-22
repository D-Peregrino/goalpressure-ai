/**
 * Monta leitura tática para um fixture (hook + match center).
 */

import type { Match } from "@/types/domain";
import type { OpsLivePressureMetric } from "@/types/opsApi";
import {
  readTacticalMatch,
  type TacticalMatchIntelligence,
} from "@/lib/tactical/tacticalMatchReader";
import type { SteamDirection } from "@/lib/signals/executionWindow";

export interface BuildTacticalFixtureInput {
  match: Match;
  fixtureId: string;
  isLive: boolean;
  isPreMatch: boolean;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  scoreKnown: boolean;
  homePressure: number;
  awayPressure: number;
  pressureScore: number;
  momentum: number;
  chaosIndex: number;
  pressureTrend?: import("@/types/domain").PressureTrend | null;
  steamMove: boolean;
  oddsDrift: number | null;
  steamDirection: SteamDirection;
  edgePercent: number | null;
  sequenceState: string | null;
  dominanceLabel: string;
}

export function buildTacticalForFixture(
  input: BuildTacticalFixtureInput
): TacticalMatchIntelligence {
  return readTacticalMatch({
    match: input.match,
    fixtureId: input.fixtureId,
    isLive: input.isLive,
    isPreMatch: input.isPreMatch,
    minute: input.minute,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
    scoreKnown: input.scoreKnown,
    homePressure: input.homePressure,
    awayPressure: input.awayPressure,
    pressureScore: input.pressureScore,
    momentum: input.momentum,
    chaosIndex: input.chaosIndex,
    pressureTrend: input.pressureTrend,
    steamMove: input.steamMove,
    oddsDrift: input.oddsDrift,
    steamDirection: input.steamDirection,
    edgePercent: input.edgePercent,
    sequenceState: input.sequenceState,
    dominanceLabel: input.dominanceLabel,
  });
}

export function splitPressureFromMatch(
  match: Match,
  ops?: Pick<
    OpsLivePressureMetric,
    "homePressure" | "awayPressure" | "pressureScore" | "momentum"
  > | null
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
