/**
 * Constrói input de microeventos a partir do fixture live e snapshots dos motores.
 */

import type { Match } from "@/types/domain";
import type { LiveMetricRecord } from "@/lib/runtime/liveRuntime";
import type { TemporalDynamicsResult } from "@/types/temporal";
import type { PlayerImpactResult } from "@/types/player";
import type { MicroeventDetectionInput } from "@/types/microevent";

function estimatePossessionSwing(match: Match): number {
  const home = match.teamStats?.home.possession ?? match.stats.possession ?? 50;
  const away =
    match.teamStats?.away.possession ?? 100 - (match.stats.possession ?? 50);
  return Math.abs(home - away);
}

function estimateXgAcceleration(match: Match, momentum: number): number {
  const xg = match.stats.xG ?? match.stats.shots * 0.08;
  const minuteFactor = Math.max(0.3, match.minute / 90);
  return clamp01((xg / minuteFactor) * 0.15 + (momentum / 100) * 0.12);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

function inferSubstitutions(minute: number): number {
  if (minute < 55) return 0;
  if (minute < 70) return 1;
  if (minute < 80) return 2;
  return 3;
}

export function buildMicroeventInput(
  match: Match,
  metric: LiveMetricRecord,
  temporal: TemporalDynamicsResult | null,
  player: PlayerImpactResult | null
): MicroeventDetectionInput {
  const fixtureId = metric.fixtureId;
  const trendMomentum = match.premium?.momentumScore ?? 0;
  const attacks =
    match.stats.totalAttacks ??
    match.teamStats?.home.totalAttacks ??
    match.stats.dangerousAttacks * 1.4 + trendMomentum * 0.15;

  return {
    fixtureId,
    matchId: match.id,
    matchLabel: metric.matchLabel,
    minute: match.minute,
    pressure: {
      pressureScore: metric.pressureScore,
      momentum: metric.momentum,
      offensiveIntensity: metric.offensiveIntensity,
      goalProbability: metric.goalProbability,
      confidence: metric.confidence,
      homePressure: metric.homePressure,
      awayPressure: metric.awayPressure,
    },
    temporal: temporal
      ? {
          chaosIndex: temporal.chaosIndex,
          urgencyMultiplier: temporal.urgencyMultiplier,
          accelerationScore: temporal.accelerationScore,
          volatilityScore: temporal.volatilityScore,
          executionPriority: temporal.executionPriority,
          matchPhase: temporal.matchPhase,
        }
      : undefined,
    player: player
      ? {
          offensiveImpact: player.offensiveImpact,
          chaosContribution: player.chaosContribution,
          substitutionSwing: player.substitutionSwing,
          clutchFactor: player.clutchFactor,
          redCardImpact: player.redCardImpact,
          flags: player.flags,
        }
      : undefined,
    attacks: Math.round(attacks),
    dangerousAttacks: match.stats.dangerousAttacks,
    corners: match.stats.corners,
    shots: match.stats.shots,
    shotsOnTarget: match.stats.shotsOnTarget,
    possessionSwing: estimatePossessionSwing(match),
    substitutions: inferSubstitutions(match.minute),
    yellowCards: 0,
    redCards: 0,
    xgAcceleration: estimateXgAcceleration(match, metric.momentum),
  };
}
