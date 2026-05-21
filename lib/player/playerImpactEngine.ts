/**
 * GoalPressure AI — Player Impact Engine institucional.
 * Modela impacto individual e agregado no runtime quantitativo live.
 */

import type {
  PlayerImpactInput,
  PlayerImpactResult,
  PlayerLineupEntry,
  PlayerSubstitution,
} from "@/types/player";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundScore(value: number): number {
  return Math.round(clamp(value, -100, 100));
}

function roundSwing(value: number): number {
  return Math.round(clamp(value, -100, 100));
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ratePlayerOffensive(p: PlayerLineupEntry): number {
  const rating = p.rating ?? 6.5;
  const xg = p.xgContribution ?? 0;
  const shots = p.shots ?? 0;
  const assists = p.assists ?? 0;
  const keyPasses = p.keyPasses ?? 0;
  const fatiguePenalty = (p.fatigue ?? 0) * 0.15;

  let score =
    (rating - 6) * 8 +
    xg * 35 +
    shots * 4 +
    assists * 12 +
    keyPasses * 5;

  if (p.position === "FWD") score += 12;
  if (p.position === "MID") score += 6;
  if (p.position === "GK" || p.position === "DEF") score -= 8;

  return clamp(score - fatiguePenalty, 0, 100);
}

function ratePlayerDefensive(p: PlayerLineupEntry): number {
  const rating = p.rating ?? 6.5;
  const defensive = p.defensiveActions ?? 0;
  const saves = p.goalkeeperSaves ?? 0;
  const fatiguePenalty = (p.fatigue ?? 0) * 0.1;

  let score =
    (rating - 6) * 6 +
    defensive * 3.5 +
    saves * 8;

  if (p.position === "GK") score += 25;
  if (p.position === "DEF") score += 15;

  return clamp(score - fatiguePenalty, 0, 100);
}

function ratePlayerChaos(p: PlayerLineupEntry, cards: number): number {
  let score = (p.sprintLoad ?? 0) * 0.4 + (p.shots ?? 0) * 2;
  if (p.cards === "RED") score += 35;
  if (p.cards === "YELLOW") score += 8;
  if (cards > 0) score += cards * 12;
  if ((p.fatigue ?? 0) > 0.75) score += 15;
  return clamp(score, 0, 100);
}

function detectStarOffensive(players: PlayerLineupEntry[]): PlayerLineupEntry | null {
  if (players.length === 0) return null;
  return [...players].sort(
    (a, b) => ratePlayerOffensive(b) - ratePlayerOffensive(a)
  )[0];
}

function detectClutchPlayer(
  players: PlayerLineupEntry[],
  minute: number
): PlayerLineupEntry | null {
  if (players.length === 0 || minute < 60) return null;
  return [...players].sort((a, b) => {
    const clutchA =
      ratePlayerOffensive(a) * 0.5 +
      (a.rating ?? 6) * 5 +
      (1 - (a.fatigue ?? 0)) * 20;
    const clutchB =
      ratePlayerOffensive(b) * 0.5 +
      (b.rating ?? 6) * 5 +
      (1 - (b.fatigue ?? 0)) * 20;
    return clutchB - clutchA;
  })[0];
}

function detectGoalkeeperHot(players: PlayerLineupEntry[]): number {
  const gks = players.filter((p) => p.position === "GK");
  if (gks.length === 0) return 40;
  return Math.max(...gks.map((g) => ratePlayerDefensive(g)));
}

function computeSubstitutionSwing(
  subs: PlayerSubstitution[],
  home: PlayerLineupEntry[],
  away: PlayerLineupEntry[]
): number {
  if (subs.length === 0) return 0;

  let swing = 0;
  for (const sub of subs) {
    const squad = sub.side === "home" ? home : away;
    const out = squad.find((p) => p.playerId === sub.playerOutId);
    const inn = sub.playerIn ?? squad.find((p) => p.playerId === sub.playerInId);
    const outOff = out ? ratePlayerOffensive(out) : 40;
    const inOff = inn ? ratePlayerOffensive(inn) : 55;
    const outDef = out ? ratePlayerDefensive(out) : 40;
    const inDef = inn ? ratePlayerDefensive(inn) : 45;
    swing += (inOff - outOff) * 0.6 + (inDef - outDef) * 0.2;
    if (inn?.position === "FWD" || inn?.position === "MID") swing += 8;
  }

  return roundSwing(swing / Math.max(1, subs.length));
}

function computeRedCardImpact(homeRed: number, awayRed: number): number {
  const total = homeRed + awayRed;
  if (total === 0) return 0;
  return roundScore(total * 22 + (total > 1 ? 25 : 10));
}

function computeFatigueImpact(players: PlayerLineupEntry[]): number {
  if (players.length === 0) return 0;
  const fatigues = players.map((p) => p.fatigue ?? 0);
  const maxF = Math.max(...fatigues);
  const avgF = avg(fatigues);
  return roundScore(maxF * 60 + avgF * 30);
}

function computePlayerVolatility(players: PlayerLineupEntry[]): number {
  if (players.length < 2) return 20;
  const offScores = players.map(ratePlayerOffensive);
  const mean = avg(offScores);
  const variance =
    offScores.reduce((s, v) => s + (v - mean) ** 2, 0) / offScores.length;
  return roundScore(Math.sqrt(variance) * 2.2);
}

function computeTeamSynergyShift(
  home: PlayerLineupEntry[],
  away: PlayerLineupEntry[],
  subs: PlayerSubstitution[]
): number {
  const homeOff = avg(home.map(ratePlayerOffensive));
  const awayOff = avg(away.map(ratePlayerOffensive));
  const baseShift = homeOff - awayOff;
  const subBoost = subs.length > 0 ? subs.length * 3 : 0;
  return roundSwing(baseShift + subBoost);
}

function buildFlags(
  input: PlayerImpactInput,
  home: PlayerLineupEntry[],
  away: PlayerLineupEntry[],
  all: PlayerLineupEntry[]
): string[] {
  const flags: string[] = [];
  const star = detectStarOffensive(all);
  const clutch = detectClutchPlayer(all, input.minute);
  const gkRes = detectGoalkeeperHot(all);
  const fatigue = computeFatigueImpact(all);

  if (star && ratePlayerOffensive(star) >= 70) flags.push("STAR_OFFENSIVE");
  if (clutch && input.minute >= 65) flags.push("CLUTCH_PLAYER");
  if (gkRes >= 72) flags.push("GOALKEEPER_HOT");
  if (fatigue >= 65) flags.push("EXTREME_FATIGUE");
  if ((input.substitutions?.length ?? 0) > 0) {
    const offSub = input.substitutions!.some(
      (s) =>
        s.playerIn?.position === "FWD" ||
        s.playerIn?.position === "MID"
    );
    if (offSub) flags.push("OFFENSIVE_SUBSTITUTION");
  }
  if ((input.homeRedCards ?? 0) + (input.awayRedCards ?? 0) > 0) {
    flags.push("RED_CARD_CASCADE");
  }
  const avgDef = avg(all.map(ratePlayerDefensive));
  const avgOff = avg(all.map(ratePlayerOffensive));
  if (avgDef < 35 && avgOff > 55) flags.push("DEFENSIVE_LOSS");

  return flags;
}

/**
 * Calcula impacto agregado de jogadores para um fixture ao vivo.
 */
export function calculatePlayerImpact(
  input: PlayerImpactInput
): PlayerImpactResult {
  const home = input.lineups.home;
  const away = input.lineups.away;
  const all = [...home, ...away];
  const subs = input.substitutions ?? [];

  const offensiveImpact = roundScore(
    avg(all.map(ratePlayerOffensive))
  );
  const defensiveImpact = roundScore(
    avg(all.map(ratePlayerDefensive))
  );
  const chaosContribution = roundScore(
    avg(all.map((p) => ratePlayerChaos(p, (input.homeRedCards ?? 0) + (input.awayRedCards ?? 0))))
  );

  const fatigueImpact = computeFatigueImpact(all);

  const clutchPlayers = [...home, ...away].filter((p) => input.minute >= 55);
  const clutchScores = clutchPlayers.map((p) => {
    const off = ratePlayerOffensive(p);
    const lateBoost = input.minute >= 75 ? 12 : 6;
    return off * 0.6 + (p.rating ?? 6) * 6 + lateBoost;
  });
  const clutchFactor = roundScore(
    clutchScores.length > 0 ? Math.max(...clutchScores) : 0
  );

  const goalkeeperResistance = roundScore(
    Math.max(detectGoalkeeperHot(home), detectGoalkeeperHot(away))
  );

  const substitutionSwing = computeSubstitutionSwing(subs, home, away);
  const redCardImpact = computeRedCardImpact(
    input.homeRedCards ?? 0,
    input.awayRedCards ?? 0
  );
  const playerVolatility = computePlayerVolatility(all);
  const teamSynergyShift = computeTeamSynergyShift(home, away, subs);
  const flags = buildFlags(input, home, away, all);

  const star = detectStarOffensive(all);
  const clutch = detectClutchPlayer(all, input.minute);
  const chaosTop = [...all].sort(
    (a, b) =>
      ratePlayerChaos(b, 0) - ratePlayerChaos(a, 0)
  )[0];
  const fatigueTop = [...all].sort(
    (a, b) => (b.fatigue ?? 0) - (a.fatigue ?? 0)
  )[0];

  return {
    fixtureId: input.fixtureId,
    matchId: input.matchId,
    matchLabel: input.matchLabel,
    minute: input.minute,
    offensiveImpact,
    defensiveImpact,
    chaosContribution,
    fatigueImpact,
    clutchFactor,
    goalkeeperResistance,
    substitutionSwing,
    redCardImpact,
    playerVolatility,
    teamSynergyShift,
    flags,
    topClutchPlayer: clutch?.name ?? star?.name,
    topFatigueAlert:
      (fatigueTop?.fatigue ?? 0) > 0.7 ? fatigueTop.name : undefined,
    topChaosContributor: chaosTop?.name,
    computedAt: new Date().toISOString(),
  };
}

/** Boost de urgência para Signal Decision (1 = neutro). */
export function playerImpactUrgencyBoost(result: PlayerImpactResult): number {
  if (result.clutchFactor >= 75) return 1.15;
  if (result.clutchFactor >= 60) return 1.08;
  if (result.substitutionSwing >= 25) return 1.1;
  return 1;
}

/** Ajuste de edge para Market Calibration. */
export function playerMarketEdgeBoost(result: PlayerImpactResult): number {
  const offBoost = (result.offensiveImpact - 50) * 0.0008;
  const swingBoost = result.substitutionSwing * 0.0005;
  return offBoost + swingBoost;
}

/** Boost de chaos para Temporal Dynamics. */
export function playerChaosBoost(result: PlayerImpactResult): number {
  return Math.min(15, result.chaosContribution * 0.12 + result.redCardImpact * 0.08);
}
