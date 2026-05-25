import type {
  HistoricalSignalOutcome,
  TeamBehaviorProfile,
  TeamProfileType,
} from "@/lib/engine/learning/learning.types";

function pct(hits: number, total: number): number {
  return total > 0 ? hits / total : 0;
}

const PROFILE_LABELS: Record<TeamProfileType, string> = {
  AGGRESSIVE_STARTER: "Início agressivo",
  LATE_PRESSURE: "Pressão tardia",
  LOW_CONVERSION: "Baixa conversão",
  HIGH_CONVERSION: "Alta conversão",
  COMEBACK_TENDENCY: "Tendência de reação",
  CORNER_HEAVY: "Cerco de escanteios",
  CHAOTIC_TRANSITION: "Transições caóticas",
};

function inferProfile(rows: HistoricalSignalOutcome[]): {
  profile: TeamProfileType;
  score: number;
} | null {
  if (rows.length < 2) return null;

  const hits = rows.filter((r) => r.outcome === "HIT").length;
  const hitRate = pct(hits, rows.length);
  const early = rows.filter((r) => r.minute < 30);
  const late = rows.filter((r) => r.minute >= 70);
  const earlyHits = early.filter((r) => r.outcome === "HIT").length;
  const lateHits = late.filter((r) => r.outcome === "HIT").length;
  const avgP = rows.reduce((s, r) => s + r.pressureScore, 0) / rows.length;

  if (early.length >= 2 && pct(earlyHits, early.length) >= 0.55) {
    return { profile: "AGGRESSIVE_STARTER", score: 72 };
  }
  if (late.length >= 2 && pct(lateHits, late.length) >= 0.55) {
    return { profile: "LATE_PRESSURE", score: 75 };
  }
  if (hitRate < 0.35 && avgP >= 55) {
    return { profile: "LOW_CONVERSION", score: 68 };
  }
  if (hitRate >= 0.55) {
    return { profile: "HIGH_CONVERSION", score: 80 };
  }
  if (rows.some((r) => r.signalType.includes("COMEBACK") || r.minute >= 60)) {
    const comebackHits = rows
      .filter((r) => r.minute >= 60)
      .filter((r) => r.outcome === "HIT").length;
    if (rows.filter((r) => r.minute >= 60).length >= 2 && comebackHits >= 1) {
      return { profile: "COMEBACK_TENDENCY", score: 62 };
    }
  }
  if (rows.some((r) => r.signalType.includes("CORNER"))) {
    return { profile: "CORNER_HEAVY", score: 60 };
  }
  if (avgP >= 65 && hitRate < 0.45) {
    return { profile: "CHAOTIC_TRANSITION", score: 64 };
  }

  return { profile: "HIGH_CONVERSION", score: Math.round(hitRate * 100) };
}

/**
 * Perfis táticos históricos por time.
 */
export function detectTeamProfiles(
  outcomes: HistoricalSignalOutcome[]
): TeamBehaviorProfile[] {
  const resolved = outcomes.filter((o) => o.outcome === "HIT" || o.outcome === "MISS");
  const byTeam = new Map<string, HistoricalSignalOutcome[]>();

  for (const o of resolved) {
    for (const team of [o.homeTeam, o.awayTeam]) {
      if (!team) continue;
      const key = `${team}|${o.league}`;
      const list = byTeam.get(key) ?? [];
      list.push(o);
      byTeam.set(key, list);
    }
  }

  const profiles: TeamBehaviorProfile[] = [];

  for (const [key, rows] of byTeam) {
    const [team, league] = key.split("|");
    const inferred = inferProfile(rows);
    if (!inferred) continue;

    profiles.push({
      team,
      league: league ?? "",
      profile: inferred.profile,
      label: PROFILE_LABELS[inferred.profile],
      score: inferred.score,
      sampleSize: rows.length,
    });
  }

  return profiles.sort((a, b) => b.score - a.score).slice(0, 24);
}
