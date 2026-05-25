import type { Match } from "@/types/domain";
import type { MatchLearningContext } from "@/lib/engine/learning/learning.types";
import { getLearningSnapshot } from "@/lib/engine/learning/learningSnapshotStore";
import { calculateHistoricalEdge } from "@/lib/engine/learning/calculateHistoricalEdge";
import { loadHistoricalOutcomes } from "@/lib/engine/learning/loadHistoricalOutcomes";

let outcomesCache: Awaited<ReturnType<typeof loadHistoricalOutcomes>> | null = null;
let outcomesCacheMs = 0;
const OUTCOMES_CACHE_MS = 60_000;

async function getOutcomesCached() {
  if (outcomesCache && Date.now() - outcomesCacheMs < OUTCOMES_CACHE_MS) {
    return outcomesCache;
  }
  outcomesCache = await loadHistoricalOutcomes();
  outcomesCacheMs = Date.now();
  return outcomesCache;
}

export async function buildMatchLearningContext(
  match: Match
): Promise<MatchLearningContext | null> {
  const snapshot = getLearningSnapshot();
  const outcomes = await getOutcomesCached();

  const leagueProfile =
    snapshot?.leagues.find((l) => l.league === match.league) ??
    null;
  const teamProfiles = (snapshot?.teams ?? []).filter(
    (t) => t.team === match.homeTeam || t.team === match.awayTeam
  );
  const patterns = (snapshot?.patterns ?? []).filter(
    (p) => !p.league || p.league === match.league
  );

  const historicalEdge = calculateHistoricalEdge(match, {
    outcomes,
    leagueProfile,
    teamProfiles,
    patterns,
  });

  return {
    historicalEdge,
    leagueProfile,
    teamProfiles,
    patterns: patterns.slice(0, 3),
    updatedAt: new Date().toISOString(),
  };
}

export function applyLearningContextToMatch(
  match: Match,
  ctx: MatchLearningContext
): Match {
  return {
    ...match,
    learningContext: ctx,
  };
}

/** Versão síncrona leve quando snapshot já está em memória. */
export function applyLearningFromSnapshot(match: Match): Match {
  const snapshot = getLearningSnapshot();
  if (!snapshot) return match;

  const leagueProfile =
    snapshot.leagues.find((l) => l.league === match.league) ?? null;
  const teamProfiles = snapshot.teams.filter(
    (t) => t.team === match.homeTeam || t.team === match.awayTeam
  );
  const patterns = snapshot.patterns.filter(
    (p) => !p.league || p.league === match.league
  );

  const historicalEdge = calculateHistoricalEdge(match, {
    outcomes: [],
    leagueProfile,
    teamProfiles,
    patterns,
  });

  const ctx: MatchLearningContext = {
    historicalEdge,
    leagueProfile,
    teamProfiles,
    patterns: patterns.slice(0, 3),
    updatedAt: snapshot.generatedAt,
  };

  return applyLearningContextToMatch(match, ctx);
}
