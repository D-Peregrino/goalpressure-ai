"use client";

import { useEffect, useState } from "react";
import { applyPressureToMatch } from "@/lib/pressureScore";
import type { Match } from "@/types/domain";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function tickOdd(value: number): number {
  const shift = (Math.random() - 0.5) * 0.04;
  return clamp(Number((value + shift).toFixed(2)), 1.2, 3.5);
}

function tickMatch(match: Match): Match {
  const previousScore = match.pressure.score;
  const newMinute =
    match.minute < 90 && Math.random() > 0.65 ? match.minute + 1 : match.minute;
  const newShots = match.stats.shots + (Math.random() > 0.82 ? 1 : 0);
  const newShotsOnTarget =
    match.stats.shotsOnTarget + (Math.random() > 0.88 ? 1 : 0);
  const newAttacks =
    match.stats.dangerousAttacks + (Math.random() > 0.78 ? 1 : 0);
  const newCorners = match.stats.corners + (Math.random() > 0.9 ? 1 : 0);

  const updated: Match = {
    ...match,
    minute: newMinute,
    stats: {
      shots: newShots,
      shotsOnTarget: newShotsOnTarget,
      dangerousAttacks: newAttacks,
      corners: newCorners,
    },
    odds: {
      primary: tickOdd(match.odds.primary),
      over05: tickOdd(match.odds.over05),
      over15: tickOdd(match.odds.over15),
    },
    updatedAt: Date.now(),
  };

  return applyPressureToMatch(updated, { previousScore });
}

function hydrateMatches(matches: Match[]): Match[] {
  return matches.map((m) => applyPressureToMatch(m));
}

export function useLiveGames(initialMatches: Match[]) {
  const [games, setGames] = useState<Match[]>(() =>
    hydrateMatches(initialMatches)
  );
  const [lastSync, setLastSync] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setGames((prev) => prev.map(tickMatch));
      setLastSync(Date.now());
    }, 3200);

    return () => clearInterval(interval);
  }, []);

  return { games, lastSync };
}
