/**
 * Reordenação client-side para terminal/feed — usa perfil smart sem alterar engines.
 */

import type { Match } from "@/types/domain";
import type { OperationalProfile, SmartWorkspacePayload } from "@/lib/personalization/types";

export function applyPersonalizedMatchOrder(
  matches: Match[],
  smart: SmartWorkspacePayload | null,
  favorites: Set<string>,
  watched: string[]
): Match[] {
  if (!smart) {
    return matches;
  }

  const scoreMap = new Map(
    smart.recommendedMatches.map((r) => [r.fixtureId, r.personalizedScore])
  );
  const watchedSet = new Set(watched);

  return [...matches].sort((a, b) => {
    const idA = String(a.externalId ?? a.id);
    const idB = String(b.externalId ?? b.id);
    let sA = scoreMap.get(idA) ?? a.pressure.score;
    let sB = scoreMap.get(idB) ?? b.pressure.score;

    if (favorites.has(a.id) || favorites.has(idA)) sA += 12;
    if (favorites.has(b.id) || favorites.has(idB)) sB += 12;
    if (watchedSet.has(idA)) sA += 8;
    if (watchedSet.has(idB)) sB += 8;

    if (smart.adaptiveFeedPriority === "pressure") {
      sA += a.pressure.score * 0.15;
      sB += b.pressure.score * 0.15;
    }

    return sB - sA;
  });
}

/** Ordena lista enriquecida do terminal sem converter para Match. */
export function sortEnrichedByPersonalized<T extends { fixtureId: string; pressureScore: number }>(
  items: T[],
  smart: SmartWorkspacePayload | null,
  favorites: Set<string>,
  watched: string[]
): T[] {
  if (!smart) return items;

  const scoreMap = new Map(
    smart.recommendedMatches.map((r) => [r.fixtureId, r.personalizedScore])
  );
  const watchedSet = new Set(watched);

  return [...items].sort((a, b) => {
    let sA = scoreMap.get(a.fixtureId) ?? a.pressureScore;
    let sB = scoreMap.get(b.fixtureId) ?? b.pressureScore;
    if (favorites.has(a.fixtureId)) sA += 12;
    if (favorites.has(b.fixtureId)) sB += 12;
    if (watchedSet.has(a.fixtureId)) sA += 8;
    if (watchedSet.has(b.fixtureId)) sB += 8;
    if (smart.adaptiveFeedPriority === "pressure") {
      sA += a.pressureScore * 0.12;
      sB += b.pressureScore * 0.12;
    }
    return sB - sA;
  });
}

export function profileStyleLabel(style: OperationalProfile["operationalStyle"]): string {
  const labels: Record<OperationalProfile["operationalStyle"], string> = {
    agressivo: "Operador agressivo",
    seletivo: "Operador seletivo",
    explorador: "Explorador tático",
    institucional: "Perfil institucional",
  };
  return labels[style];
}
