/**
 * Constrói contexto de jogadores a partir de Match quando lineups SportMonks não estão disponíveis.
 */

import type { Match } from "@/types/domain";
import type {
  PlayerImpactInput,
  PlayerLineupEntry,
  PlayerSubstitution,
} from "@/types/player";

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function syntheticPlayer(
  id: string,
  name: string,
  position: PlayerLineupEntry["position"],
  stats: Partial<PlayerLineupEntry>
): PlayerLineupEntry {
  return {
    playerId: id,
    name,
    position,
    rating: stats.rating ?? 6.8,
    xgContribution: stats.xgContribution ?? 0,
    shots: stats.shots ?? 0,
    assists: stats.assists ?? 0,
    keyPasses: stats.keyPasses ?? 0,
    defensiveActions: stats.defensiveActions ?? 0,
    goalkeeperSaves: stats.goalkeeperSaves ?? 0,
    sprintLoad: stats.sprintLoad ?? 0,
    fatigue: stats.fatigue ?? 0,
    cards: stats.cards ?? "NONE",
    isStarter: true,
    minutesPlayed: stats.minutesPlayed ?? 0,
  };
}

function buildSideSquad(
  side: "home" | "away",
  teamName: string,
  teamStats: {
    shots: number;
    shotsOnTarget: number;
    dangerousAttacks: number;
    xG?: number;
    possession?: number;
  },
  minute: number
): PlayerLineupEntry[] {
  const fatigueBase = clamp((minute - 45) / 50, 0, 0.85);
  const xg = teamStats.xG ?? teamStats.shots * 0.06;
  const shots = Math.max(1, Math.round(teamStats.shots * 0.35));
  const sot = Math.max(0, Math.round(teamStats.shotsOnTarget * 0.4));
  const da = Math.max(0, Math.round(teamStats.dangerousAttacks * 0.25));

  return [
    syntheticPlayer(`${side}-gk`, `${teamName} GK`, "GK", {
      rating: 7,
      goalkeeperSaves: Math.round(da * 0.3 + shots * 0.2),
      defensiveActions: Math.round(da * 0.4),
      fatigue: fatigueBase * 0.7,
      minutesPlayed: minute,
    }),
    syntheticPlayer(`${side}-def`, `${teamName} DEF`, "DEF", {
      rating: 6.9,
      defensiveActions: da,
      fatigue: fatigueBase * 0.85,
      minutesPlayed: minute,
    }),
    syntheticPlayer(`${side}-mid`, `${teamName} MID`, "MID", {
      rating: 7.1,
      keyPasses: Math.round(da * 0.35),
      assists: Math.round(sot * 0.15),
      xgContribution: xg * 0.25,
      sprintLoad: 55 + da,
      fatigue: fatigueBase,
      minutesPlayed: minute,
    }),
    syntheticPlayer(`${side}-fwd`, `${teamName} FWD`, "FWD", {
      rating: 7.3,
      shots,
      xgContribution: xg * 0.55,
      assists: Math.round(sot * 0.1),
      sprintLoad: 60 + shots * 3,
      fatigue: fatigueBase * 0.95,
      minutesPlayed: minute,
    }),
  ];
}

function inferSubstitutions(
  minute: number,
  home: PlayerLineupEntry[],
  away: PlayerLineupEntry[]
): PlayerSubstitution[] {
  if (minute < 55) return [];

  const subs: PlayerSubstitution[] = [];
  if (minute >= 60) {
    subs.push({
      side: "home",
      minute: Math.min(70, minute),
      playerOutId: "home-mid",
      playerInId: "home-sub-fwd",
      playerIn: syntheticPlayer("home-sub-fwd", "Home Sub FWD", "FWD", {
        rating: 7.2,
        shots: 2,
        xgContribution: 0.15,
        fatigue: 0.2,
        minutesPlayed: minute - 60,
      }),
    });
  }
  if (minute >= 65) {
    subs.push({
      side: "away",
      minute: Math.min(75, minute),
      playerOutId: "away-def",
      playerInId: "away-sub-mid",
      playerIn: syntheticPlayer("away-sub-mid", "Away Sub MID", "MID", {
        rating: 7,
        keyPasses: 3,
        xgContribution: 0.1,
        fatigue: 0.25,
        minutesPlayed: minute - 65,
      }),
    });
  }

  void home;
  void away;
  return subs;
}

/**
 * Estima lineups a partir de estatísticas agregadas do fixture (fallback institucional).
 */
export function buildPlayerImpactInputFromMatch(match: Match): PlayerImpactInput {
  const fixtureId = match.externalId ?? match.id.replace(/^sm-/, "");
  const homeStats = match.teamStats?.home ?? {
    shots: Math.round(match.stats.shots * 0.5),
    shotsOnTarget: Math.round(match.stats.shotsOnTarget * 0.5),
    dangerousAttacks: Math.round(match.stats.dangerousAttacks * 0.5),
    xG: (match.stats.xG ?? 0) * 0.5,
    possession: match.stats.possession ?? 50,
  };
  const awayStats = match.teamStats?.away ?? {
    shots: Math.round(match.stats.shots * 0.5),
    shotsOnTarget: Math.round(match.stats.shotsOnTarget * 0.5),
    dangerousAttacks: Math.round(match.stats.dangerousAttacks * 0.5),
    xG: (match.stats.xG ?? 0) * 0.5,
    possession: 100 - (match.stats.possession ?? 50),
  };

  const home = buildSideSquad("home", match.homeTeam, homeStats, match.minute);
  const away = buildSideSquad("away", match.awayTeam, awayStats, match.minute);

  return {
    fixtureId,
    matchId: match.id,
    matchLabel: `${match.homeTeam} vs ${match.awayTeam}`,
    minute: match.minute,
    lineups: { home, away },
    substitutions: inferSubstitutions(match.minute, home, away),
    homeRedCards: 0,
    awayRedCards: 0,
  };
}
