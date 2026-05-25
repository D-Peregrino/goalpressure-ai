import { getMatchLabel } from "@/types/domain";
import type { Match } from "@/types/domain";

export function rankMatchesForUser(
  matches: Match[],
  favorites: Set<string>,
  watched: string[]
): Match[] {
  const watchedSet = new Set(watched);
  return [...matches].sort((a, b) => {
    const scoreA =
      a.pressure.score +
      (favorites.has(a.id) ? 25 : 0) +
      (watchedSet.has(a.id) ? 12 : 0);
    const scoreB =
      b.pressure.score +
      (favorites.has(b.id) ? 25 : 0) +
      (watchedSet.has(b.id) ? 12 : 0);
    return scoreB - scoreA;
  });
}

export function matchHref(match: Match): string {
  const id = match.externalId ?? match.id;
  return `/match/${encodeURIComponent(String(id))}`;
}

export function matchListLabel(match: Match): string {
  return `${getMatchLabel(match)} · ${match.minute}'`;
}
