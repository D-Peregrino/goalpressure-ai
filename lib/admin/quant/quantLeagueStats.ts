import type { HistoricalSignalOutcome } from "@/lib/engine/learning/learning.types";
import type { QuantLeagueRow } from "@/lib/admin/quant/quant.types";
import { clamp100, pct } from "@/lib/admin/quant/quantMetrics";
import { rankByScore } from "@/lib/admin/quant/quantRanking";
import { getTopLeagueReliability } from "@/lib/learning/leagueReliability";

interface LeagueCell {
  hits: number;
  total: number;
  pressureSum: number;
  evSum: number;
  evN: number;
  minuteSum: number;
}

export function buildLeagueStatsFromOutcomes(
  outcomes: HistoricalSignalOutcome[]
): QuantLeagueRow[] {
  const map = new Map<string, LeagueCell>();

  for (const o of outcomes) {
    const league = o.league || "Geral";
    const cell = map.get(league) ?? {
      hits: 0,
      total: 0,
      pressureSum: 0,
      evSum: 0,
      evN: 0,
      minuteSum: 0,
    };
    cell.total += 1;
    if (o.outcome === "HIT") cell.hits += 1;
    cell.pressureSum += o.pressureScore;
    cell.minuteSum += o.minute;
    if (o.evPercent != null) {
      cell.evSum += o.evPercent;
      cell.evN += 1;
    }
    map.set(league, cell);
  }

  const runtimeLeagues = getTopLeagueReliability(24);
  const runtimeByName = new Map(runtimeLeagues.map((l) => [l.league, l]));

  const rows: QuantLeagueRow[] = [];
  for (const [league, cell] of map) {
    const hitRate = cell.total > 0 ? cell.hits / cell.total : 0;
    const avgPressure = cell.total > 0 ? cell.pressureSum / cell.total : 0;
    const chaos = clamp100(100 - hitRate * 55 + avgPressure * 0.15);
    const rt = runtimeByName.get(league);
    rows.push({
      league,
      reliability: rt?.score ?? clamp100(hitRate * 100 * 0.6 + (100 - chaos) * 0.4),
      chaos,
      contextualEv: cell.evN > 0 ? round(cell.evSum / cell.evN) : 0,
      marketLag: rt ? clamp100(100 - rt.noise) : clamp100(avgPressure * 0.4),
      predictability: rt?.predictability ?? pct(cell.hits, cell.total),
      samples: cell.total,
    });
  }

  return rankByScore(rows, (r) => r.reliability, 16);
}

function round(n: number): number {
  return Math.round(n * 10) / 10;
}
