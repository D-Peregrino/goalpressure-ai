import type { OpsMatchSlot } from "@/lib/ops/opsCenter.types";

export interface OpsPriorityContext {
  watchlistFixtureIds?: Set<string>;
  highGpiThreshold?: number;
}

/** Prioriza jogos para radar e multi-view — sem alterar engines de jogo. */
export function computeMatchPriority(
  slot: Pick<
    OpsMatchSlot,
    | "pressureScore"
    | "gpiScore"
    | "consensusScore"
    | "evContext"
    | "oddsLag"
    | "fixtureId"
    | "isLive"
  >,
  ctx: OpsPriorityContext = {}
): number {
  const gpi = slot.gpiScore ?? 0;
  const consensus = slot.consensusScore ?? 0;
  const ev = slot.evContext ?? 0;

  let score =
    slot.pressureScore * 0.38 +
    gpi * 0.32 +
    consensus * 0.2 +
    Math.min(20, ev * 4);

  if (slot.isLive) score += 8;
  if (slot.oddsLag) score += 6;
  if (ctx.watchlistFixtureIds?.has(slot.fixtureId)) score += 12;
  if (gpi >= (ctx.highGpiThreshold ?? 72)) score += 10;

  return Math.min(100, Math.max(0, Math.round(score)));
}

export function sortMatchesByPriority(matches: OpsMatchSlot[]): OpsMatchSlot[] {
  return [...matches].sort((a, b) => b.priorityScore - a.priorityScore);
}

export function pickTopMatches(matches: OpsMatchSlot[], count: number): OpsMatchSlot[] {
  return sortMatchesByPriority(matches).slice(0, count);
}
