import type { HistoricalSignalOutcome } from "@/lib/engine/learning/learning.types";
import type { LeagueReliabilityEntry } from "@/lib/learning/adaptiveLearning.types";
import type { Match } from "@/types/domain";

const leagueStats = new Map<
  string,
  { hits: number; total: number; pressureSum: number; chaosSum: number; n: number }
>();

function clamp100(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function ingestLeagueFromOutcome(o: HistoricalSignalOutcome): void {
  const league = o.league || "Geral";
  const cell = leagueStats.get(league) ?? {
    hits: 0,
    total: 0,
    pressureSum: 0,
    chaosSum: 0,
    n: 0,
  };
  cell.total += 1;
  if (o.outcome === "HIT") cell.hits += 1;
  cell.pressureSum += o.pressureScore;
  cell.n += 1;
  leagueStats.set(league, cell);
}

export function ingestLeagueFromLiveMatch(match: Match): void {
  const league = match.league || "Geral";
  const cell = leagueStats.get(league) ?? {
    hits: 0,
    total: 0,
    pressureSum: 0,
    chaosSum: 0,
    n: 0,
  };
  cell.chaosSum += match.chaosIndex ?? 0;
  cell.pressureSum += match.pressure?.score ?? 0;
  cell.n += 1;
  leagueStats.set(league, cell);
}

export function computeLeagueReliabilityScore(league: string): number {
  const cell = leagueStats.get(league);
  if (!cell || cell.n < 2) return 55;
  const hitRate = cell.total > 0 ? cell.hits / cell.total : 0.5;
  const avgPressure = cell.pressureSum / cell.n;
  const avgChaos = cell.chaosSum / cell.n;
  const stability = clamp100(100 - avgChaos * 0.65);
  const noise = clamp100(avgChaos * 0.85);
  const predictability = clamp100(hitRate * 100 * 0.55 + stability * 0.25 + (100 - noise) * 0.2);
  const score = clamp100(
    predictability * 0.5 + stability * 0.25 + (avgPressure > 40 ? 12 : 0) + hitRate * 25
  );
  return score;
}

export function getTopLeagueReliability(limit = 6): LeagueReliabilityEntry[] {
  const rows: LeagueReliabilityEntry[] = [];
  for (const [league, cell] of leagueStats) {
    const hitRate = cell.total > 0 ? cell.hits / cell.total : 0;
    const avgChaos = cell.n > 0 ? cell.chaosSum / cell.n : 40;
    const avgPressure = cell.n > 0 ? cell.pressureSum / cell.n : 0;
    const stability = clamp100(100 - avgChaos * 0.65);
    const noise = clamp100(avgChaos * 0.85);
    const predictability = clamp100(hitRate * 100 * 0.55 + stability * 0.25);
    const score = computeLeagueReliabilityScore(league);
    let label = "Confiabilidade moderada";
    if (score >= 72) label = "Liga com boa previsibilidade contextual";
    else if (score <= 45) label = "Liga com ruído elevado — cautela operacional";

    rows.push({
      league,
      score,
      stability,
      noise,
      predictability,
      sampleSize: cell.n,
      label,
    });
    void avgPressure;
  }
  return rows.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function getLeagueWeight(league: string): number {
  const score = computeLeagueReliabilityScore(league);
  if (score >= 72) return 1.1;
  if (score <= 42) return 0.85;
  return 1;
}

export function leagueReliabilityCount(): number {
  return leagueStats.size;
}
