/**
 * Snapshot in-memory — /ops e /api/player/runtime.
 */

import type { PlayerImpactResult } from "@/types/player";

export interface PlayerOpsAlert {
  fixtureId: string;
  matchLabel?: string;
  minute: number;
  type: "clutch" | "fatigue" | "gk" | "sub" | "chaos";
  label: string;
  value: number;
}

export interface PlayerOpsSnapshot {
  updatedAt: string | null;
  matchCount: number;
  topClutchPlayers: { name: string; fixtureId: string; clutchFactor: number }[];
  fatigueAlerts: { name: string; fixtureId: string; fatigueImpact: number }[];
  goalkeeperResistance: { fixtureId: string; matchLabel?: string; value: number }[];
  substitutionImpacts: { fixtureId: string; matchLabel?: string; swing: number }[];
  chaosContributors: { name: string; fixtureId: string; chaos: number }[];
  live: PlayerImpactResult[];
}

interface GlobalPlayerSlot {
  snapshot: PlayerOpsSnapshot | null;
  byFixture: Map<string, PlayerImpactResult>;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_PLAYER_IMPACT__: GlobalPlayerSlot | undefined;
}

function getSlot(): GlobalPlayerSlot {
  if (!globalThis.__GP_PLAYER_IMPACT__) {
    globalThis.__GP_PLAYER_IMPACT__ = {
      snapshot: null,
      byFixture: new Map(),
    };
  }
  return globalThis.__GP_PLAYER_IMPACT__;
}

export function getPlayerImpactForFixture(
  fixtureId: string
): PlayerImpactResult | null {
  return getSlot().byFixture.get(fixtureId) ?? null;
}

export function getPlayerOpsSnapshot(): PlayerOpsSnapshot | null {
  return getSlot().snapshot;
}

export function setPlayerOpsSnapshot(
  results: PlayerImpactResult[]
): PlayerOpsSnapshot {
  const slot = getSlot();
  slot.byFixture.clear();
  for (const r of results) {
    slot.byFixture.set(r.fixtureId, r);
  }

  const byClutch = [...results].sort((a, b) => b.clutchFactor - a.clutchFactor);
  const byFatigue = [...results].sort((a, b) => b.fatigueImpact - a.fatigueImpact);
  const byGk = [...results].sort(
    (a, b) => b.goalkeeperResistance - a.goalkeeperResistance
  );
  const bySub = [...results].sort(
    (a, b) => Math.abs(b.substitutionSwing) - Math.abs(a.substitutionSwing)
  );
  const byChaos = [...results].sort(
    (a, b) => b.chaosContribution - a.chaosContribution
  );

  const snapshot: PlayerOpsSnapshot = {
    updatedAt: new Date().toISOString(),
    matchCount: results.length,
    topClutchPlayers: byClutch.slice(0, 8).map((r) => ({
      name: r.topClutchPlayer ?? r.fixtureId,
      fixtureId: r.fixtureId,
      clutchFactor: r.clutchFactor,
    })),
    fatigueAlerts: byFatigue
      .filter((r) => r.fatigueImpact >= 50)
      .slice(0, 8)
      .map((r) => ({
        name: r.topFatigueAlert ?? r.fixtureId,
        fixtureId: r.fixtureId,
        fatigueImpact: r.fatigueImpact,
      })),
    goalkeeperResistance: byGk.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      value: r.goalkeeperResistance,
    })),
    substitutionImpacts: bySub.slice(0, 8).map((r) => ({
      fixtureId: r.fixtureId,
      matchLabel: r.matchLabel,
      swing: r.substitutionSwing,
    })),
    chaosContributors: byChaos.slice(0, 8).map((r) => ({
      name: r.topChaosContributor ?? r.fixtureId,
      fixtureId: r.fixtureId,
      chaos: r.chaosContribution,
    })),
    live: results,
  };

  slot.snapshot = snapshot;
  return snapshot;
}
