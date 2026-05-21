/**
 * Tactical Match Intelligence — interpreta estilo de jogo a partir de dados reais.
 * Camada UX/interpretação; não altera runtime, polling nem engines.
 */

import type { Match, PressureTrend, TimelineEventSummary } from "@/types/domain";
import { getPressureScoreHistory } from "@/lib/engine/pressure/rollingWindow";
import type { SteamDirection } from "@/lib/signals/executionWindow";

export type TacticalProfile =
  | "TERRITORIAL_DOMINANCE"
  | "TRANSITION_THREAT"
  | "HIGH_PRESSURE"
  | "REACTIVE_PHASE"
  | "TRUNCATED_RHYTHM"
  | "OPEN_EXCHANGE"
  | "FAVORITE_TRAPPED"
  | "EFFECTIVE_LOW_BLOCK"
  | "PRESSURE_WITHOUT_FINISHING"
  | "DANGEROUS_COUNTER"
  | "EMOTIONAL_SWING"
  | "STERILE_POSSESSION"
  | "OFFENSIVE_SURGE"
  | "IMMINENT_GOAL_WINDOW"
  | "MARKET_LAG"
  | "ACCELERATED_PACE"
  | "PRE_MATCH_OPEN"
  | "PRE_MATCH_CLOSED"
  | "NEUTRAL_RHYTHM"
  | "LOW_DATA";

export type VolatilityProfile = "OPEN" | "STABLE" | "CHAOTIC" | "CONTROLLED";
export type OffensiveControlSide = "HOME" | "AWAY" | "BALANCED" | "NEUTRAL";

export interface TacticalMatchReaderInput {
  match: Match;
  fixtureId: string;
  isLive: boolean;
  isPreMatch: boolean;
  minute: number | null;
  homeScore: number | null;
  awayScore: number | null;
  scoreKnown: boolean;
  homePressure: number;
  awayPressure: number;
  pressureScore: number;
  momentum: number;
  chaosIndex: number;
  pressureTrend?: PressureTrend | null;
  steamMove: boolean;
  oddsDrift: number | null;
  steamDirection: SteamDirection;
  edgePercent: number | null;
  sequenceState: string | null;
  dominanceLabel: string;
}

export type TacticalNarrativeTier = "strong" | "soft" | "expectation";

export interface TacticalMatchIntelligence {
  tacticalProfile: TacticalProfile;
  tacticalNarrative: string;
  tacticalIntensity: number;
  offensiveControl: OffensiveControlSide;
  emotionalTemperature: number;
  transitionRisk: number;
  volatilityProfile: VolatilityProfile;
  confidence: number;
  sourcesUsed: string[];
  reasoning: string;
  profileLabel: string;
  /** Narrativa suavizada por pouca evidência. */
  limitedReading: boolean;
  narrativeTier: TacticalNarrativeTier;
}

interface SideMetrics {
  possession: number | null;
  dangerousAttacks: number;
  shots: number;
  shotsOnTarget: number;
  corners: number;
  xG: number | null;
}

interface TacticalSignals {
  territorialSkew: number;
  finishingGap: number;
  transitionThreat: number;
  highPressure: number;
  reactive: number;
  truncated: number;
  openExchange: number;
  favoriteTrapped: number;
  lowBlock: number;
  pressureNoFinish: number;
  counterThreat: number;
  emotional: number;
  sterile: number;
  offensiveSurge: number;
  goalWindow: number;
  marketLag: number;
  accelerated: number;
}

interface NarrativePick {
  profile: TacticalProfile;
  text: string;
  priority: number;
  reason: string;
  /** Derivada do fingerprint do fixture (stats/placar/minuto). */
  contextual?: boolean;
}

const PROFILE_LABELS: Record<TacticalProfile, string> = {
  TERRITORIAL_DOMINANCE: "Domínio territorial",
  TRANSITION_THREAT: "Jogo de transição",
  HIGH_PRESSURE: "Pressão alta",
  REACTIVE_PHASE: "Jogo reativo",
  TRUNCATED_RHYTHM: "Jogo truncado",
  OPEN_EXCHANGE: "Jogo aberto",
  FAVORITE_TRAPPED: "Favorito encurralado",
  EFFECTIVE_LOW_BLOCK: "Retranca efetiva",
  PRESSURE_WITHOUT_FINISHING: "Pressão sem eficiência",
  DANGEROUS_COUNTER: "Contra-ataque perigoso",
  EMOTIONAL_SWING: "Jogo emocional",
  STERILE_POSSESSION: "Controle estéril",
  OFFENSIVE_SURGE: "Intensidade ofensiva",
  IMMINENT_GOAL_WINDOW: "Risco de gol iminente",
  MARKET_LAG: "Mercado defasado",
  ACCELERATED_PACE: "Ritmo acelerado",
  PRE_MATCH_OPEN: "Pré-jogo aberto",
  PRE_MATCH_CLOSED: "Pré-jogo fechado",
  NEUTRAL_RHYTHM: "Ritmo equilibrado",
  LOW_DATA: "Leitura limitada",
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function shortName(team: string): string {
  const parts = team.trim().split(/\s+/);
  return parts[parts.length - 1] ?? team;
}

function isGoalEvent(type: string): boolean {
  const t = type.toUpperCase();
  return t.includes("GOAL") && !t.includes("OWN") && !t.includes("MISSED");
}

function isCardEvent(type: string): boolean {
  const t = type.toUpperCase();
  return t.includes("CARD") || t.includes("YELLOW") || t.includes("RED");
}

function resolveSideMetrics(match: Match, homePressure: number, awayPressure: number): {
  home: SideMetrics;
  away: SideMetrics;
  hasTeamStats: boolean;
  hasRealPossession: boolean;
} {
  const ts = match.teamStats;
  if (ts) {
    const homePoss =
      ts.home.possession != null && ts.home.possession > 0 && ts.home.possession !== 50
        ? ts.home.possession
        : null;
    const awayPoss =
      ts.away.possession != null && ts.away.possession > 0 && ts.away.possession !== 50
        ? ts.away.possession
        : null;
    return {
      home: {
        possession: homePoss,
        dangerousAttacks: ts.home.dangerousAttacks,
        shots: ts.home.shots,
        shotsOnTarget: ts.home.shotsOnTarget,
        corners: ts.home.corners,
        xG: ts.home.xG ?? null,
      },
      away: {
        possession: awayPoss,
        dangerousAttacks: ts.away.dangerousAttacks,
        shots: ts.away.shots,
        shotsOnTarget: ts.away.shotsOnTarget,
        corners: ts.away.corners,
        xG: ts.away.xG ?? null,
      },
      hasTeamStats: true,
      hasRealPossession: homePoss != null || awayPoss != null,
    };
  }

  const agg = match.stats;
  const poss = agg.possession;
  const hasRealPossession =
    poss != null && poss > 0 && poss !== 50 && (agg.dangerousAttacks > 0 || agg.shots > 0);
  const pressureSum = homePressure + awayPressure || 1;
  const homeShare = homePressure / pressureSum;
  const awayShare = awayPressure / pressureSum;

  return {
    home: {
      possession: hasRealPossession ? Math.round(poss! * homeShare) : null,
      dangerousAttacks: Math.round(agg.dangerousAttacks * homeShare),
      shots: Math.round(agg.shots * homeShare),
      shotsOnTarget: Math.round(agg.shotsOnTarget * homeShare),
      corners: Math.round(agg.corners * homeShare),
      xG: agg.xG != null && agg.xG > 0 ? agg.xG * homeShare : null,
    },
    away: {
      possession: hasRealPossession ? Math.round(poss! * awayShare) : null,
      dangerousAttacks: Math.round(agg.dangerousAttacks * awayShare),
      shots: Math.round(agg.shots * awayShare),
      shotsOnTarget: Math.round(agg.shotsOnTarget * awayShare),
      corners: Math.round(agg.corners * awayShare),
      xG: agg.xG != null && agg.xG > 0 ? agg.xG * awayShare : null,
    },
    hasTeamStats: false,
    hasRealPossession,
  };
}

function recentEvents(
  events: TimelineEventSummary[],
  minute: number,
  window: number
): TimelineEventSummary[] {
  if (events.length === 0 || minute <= 0) return [];
  const from = Math.max(0, minute - window);
  return events.filter((e) => e.minute >= from && e.minute <= minute);
}

function collectSources(
  match: Match,
  input: TacticalMatchReaderInput,
  flags: {
    hasTeamStats: boolean;
    hasRealPossession: boolean;
    hasTimeline: boolean;
    hasStats: boolean;
    hasPressureHistory: boolean;
    hasMarket: boolean;
  }
): string[] {
  const s: string[] = [];
  if (flags.hasStats) s.push("stats");
  if (flags.hasTeamStats) s.push("teamStats");
  if (flags.hasRealPossession) s.push("posse");
  if (match.stats.xG != null && match.stats.xG > 0) s.push("xG");
  if (match.stats.corners > 0) s.push("escanteios");
  if (flags.hasTimeline) s.push("timeline");
  if (flags.hasPressureHistory) s.push("sequenciaPressao");
  if ((input.minute ?? 0) > 0) s.push("minuto");
  if (input.scoreKnown) s.push("placar");
  if (flags.hasMarket) s.push("oddsMovement");
  if (input.steamMove) s.push("steam");
  if (input.sequenceState) s.push("sequence");
  if (input.dominanceLabel !== "BALANCED") s.push("dominanceLabel");
  return s;
}

function assessConfidence(
  sources: string[],
  isPreMatch: boolean,
  hasTeamStats: boolean,
  hasTimeline: boolean,
  minute: number
): number {
  let score = 0;
  if (sources.includes("stats")) score += 18;
  if (sources.includes("teamStats")) score += 22;
  if (sources.includes("posse")) score += 14;
  if (sources.includes("xG")) score += 12;
  if (sources.includes("timeline")) score += 16;
  if (sources.includes("sequenciaPressao")) score += 10;
  if (sources.includes("placar")) score += 8;
  if (sources.includes("minuto") && minute > 0) score += 6;
  if (sources.includes("oddsMovement")) score += 8;

  if (isPreMatch) {
    score = Math.min(score, sources.includes("oddsMovement") ? 42 : 28);
  }
  if (!hasTeamStats && !sources.includes("posse")) score *= 0.72;
  if (!hasTimeline && minute > 30) score *= 0.88;
  if (sources.length < 3) score = Math.min(score, 35);

  return clamp(Math.round(score), 0, 100);
}

function finishingEfficiency(side: SideMetrics): number | null {
  if (side.dangerousAttacks < 4 && side.shots < 3) return null;
  if (side.xG != null && side.xG > 0 && side.dangerousAttacks > 0) {
    return clamp(side.xG / (side.dangerousAttacks * 0.12), 0, 1.2);
  }
  if (side.shots > 0) {
    return clamp(side.shotsOnTarget / side.shots, 0, 1);
  }
  if (side.dangerousAttacks > 0) {
    return clamp(side.shotsOnTarget / side.dangerousAttacks, 0, 0.8);
  }
  return null;
}

function detectSignals(
  match: Match,
  input: TacticalMatchReaderInput,
  home: SideMetrics,
  away: SideMetrics,
  minute: number
): TacticalSignals {
  const homeName = shortName(match.homeTeam);
  const awayName = shortName(match.awayTeam);
  const possGap =
    home.possession != null && away.possession != null
      ? home.possession - away.possession
      : 0;
  const daGap = home.dangerousAttacks - away.dangerousAttacks;
  const sotGap = home.shotsOnTarget - away.shotsOnTarget;
  const totalGoals =
    input.scoreKnown && input.homeScore != null && input.awayScore != null
      ? input.homeScore + input.awayScore
      : 0;
  const scoreDiff =
    input.scoreKnown && input.homeScore != null && input.awayScore != null
      ? input.homeScore - input.awayScore
      : 0;

  const homeEff = finishingEfficiency(home);
  const awayEff = finishingEfficiency(away);
  const aggEff =
    match.stats.shots > 0
      ? clamp(match.stats.shotsOnTarget / match.stats.shots, 0, 1)
      : null;

  const events = match.premium?.timelineEvents ?? [];
  const recent = recentEvents(events, minute, 10);
  const recentGoals = recent.filter((e) => isGoalEvent(e.type)).length;
  const recentCards = recent.filter((e) => isCardEvent(e.type)).length;

  const history = getPressureScoreHistory(match.id);
  const pressureRising =
    history.length >= 2
      ? history[history.length - 1]! > history[history.length - 2]! + 3
      : input.pressureTrend === "RISING";

  const territorialSkew =
    possGap >= 10 && daGap >= 4
      ? clamp(55 + possGap * 0.8 + daGap * 1.5, 0, 100)
      : possGap <= -10 && daGap <= -4
        ? clamp(55 + Math.abs(possGap) * 0.8 + Math.abs(daGap) * 1.5, 0, 100)
        : Math.abs(daGap) >= 6
          ? clamp(50 + Math.abs(daGap) * 2.5, 0, 100)
          : 0;

  const finishingGap =
    home.possession != null &&
    home.possession >= 58 &&
    homeEff != null &&
    homeEff < 0.28 &&
    home.dangerousAttacks >= 8
      ? clamp(70 + home.dangerousAttacks * 0.5, 0, 100)
      : away.possession != null &&
          away.possession >= 58 &&
          awayEff != null &&
          awayEff < 0.28 &&
          away.dangerousAttacks >= 8
        ? clamp(70 + away.dangerousAttacks * 0.5, 0, 100)
        : 0;

  const transitionThreat =
    away.possession != null &&
    away.possession < 48 &&
    away.dangerousAttacks >= 6 &&
    (awayEff ?? 0) >= 0.32 &&
    input.awayPressure > input.homePressure + 8
      ? clamp(60 + away.dangerousAttacks + (awayEff ?? 0) * 40, 0, 100)
      : 0;

  const highPressure = input.pressureScore >= 62 ? clamp(input.pressureScore, 0, 100) : 0;

  const reactive =
    input.pressureTrend === "FALLING" && recentGoals > 0
      ? clamp(55 + recentGoals * 18, 0, 100)
      : input.pressureTrend === "FALLING" && minute > 35
        ? 48
        : 0;

  const truncated =
    minute >= 25 &&
    match.stats.shots < 8 &&
    match.stats.dangerousAttacks < 12 &&
    input.pressureScore < 45
      ? clamp(75 - input.pressureScore, 0, 100)
      : 0;

  const openExchange =
    totalGoals >= 2 &&
    home.dangerousAttacks >= 6 &&
    away.dangerousAttacks >= 6 &&
    input.chaosIndex >= 50
      ? clamp(50 + totalGoals * 12 + input.chaosIndex * 0.35, 0, 100)
      : 0;

  const favoriteTrapped =
    (input.dominanceLabel === "HOME_DOMINANT" &&
      input.scoreKnown &&
      scoreDiff < 0 &&
      daGap >= 4) ||
    (input.dominanceLabel === "AWAY_DOMINANT" &&
      input.scoreKnown &&
      scoreDiff > 0 &&
      daGap <= -4)
      ? clamp(72 + Math.abs(scoreDiff) * 10, 0, 100)
      : scoreDiff > 0 &&
          input.awayPressure > input.homePressure + 12 &&
          input.scoreKnown
        ? clamp(68 + (input.awayPressure - input.homePressure), 0, 100)
        : scoreDiff < 0 &&
            input.homePressure > input.awayPressure + 12 &&
            input.scoreKnown
          ? clamp(68 + (input.homePressure - input.awayPressure), 0, 100)
          : 0;

  const lowBlock =
    input.scoreKnown &&
    ((scoreDiff < 0 && away.dangerousAttacks < home.dangerousAttacks - 5) ||
      (scoreDiff > 0 && home.dangerousAttacks < away.dangerousAttacks - 5))
      ? clamp(65 + Math.abs(scoreDiff) * 12, 0, 100)
      : 0;

  const pressureNoFinish =
    input.pressureScore >= 58 &&
    aggEff != null &&
    aggEff < 0.3 &&
    match.stats.shotsOnTarget <= 4
      ? clamp(input.pressureScore * 0.85 + (0.3 - aggEff) * 80, 0, 100)
      : 0;

  const counterThreat =
    input.awayPressure > input.homePressure + 14 &&
    away.shotsOnTarget >= 3 &&
    away.dangerousAttacks >= 5
      ? clamp(60 + away.shotsOnTarget * 8, 0, 100)
      : input.homePressure > input.awayPressure + 14 &&
          home.shotsOnTarget >= 3 &&
          home.dangerousAttacks >= 5
        ? clamp(60 + home.shotsOnTarget * 8, 0, 100)
        : 0;

  const emotional =
    recentGoals > 0 || recentCards >= 2
      ? clamp(50 + recentGoals * 22 + recentCards * 12, 0, 100)
      : 0;

  const sterile =
    home.possession != null &&
    home.possession >= 60 &&
    match.stats.shotsOnTarget <= 3 &&
    minute >= 30 &&
    input.pressureScore < 55
      ? clamp(home.possession * 0.6 + (30 - match.stats.shotsOnTarget) * 4, 0, 100)
      : 0;

  const offensiveSurge =
    input.momentum >= 62 &&
    match.stats.dangerousAttacks >= 14 &&
    input.pressureScore >= 55
      ? clamp(input.momentum * 0.7 + match.stats.dangerousAttacks, 0, 100)
      : 0;

  const goalWindow =
    minute >= 70 &&
    input.scoreKnown &&
    Math.abs(scoreDiff) <= 1 &&
    input.pressureScore >= 60 &&
    (pressureRising || input.momentum >= 58)
      ? clamp(55 + (90 - minute) * 0.5 + input.pressureScore * 0.35, 0, 100)
      : 0;

  const marketLag =
    pressureRising &&
    !input.steamMove &&
    (input.oddsDrift == null || Math.abs(input.oddsDrift) < 0.03) &&
    input.pressureScore >= 55 &&
    (input.edgePercent ?? 0) >= 4
      ? clamp(input.pressureScore * 0.6 + (input.edgePercent ?? 0) * 3, 0, 100)
      : 0;

  const expectedPace = minute > 0 ? (match.stats.dangerousAttacks / minute) * 90 : 0;
  const accelerated =
    minute >= 20 &&
    minute < 70 &&
    expectedPace >= 22 &&
    input.momentum >= 65
      ? clamp(expectedPace * 2 + input.momentum * 0.4, 0, 100)
      : 0;

  void homeName;
  void awayName;
  void sotGap;

  return {
    territorialSkew,
    finishingGap,
    transitionThreat,
    highPressure,
    reactive,
    truncated,
    openExchange,
    favoriteTrapped,
    lowBlock,
    pressureNoFinish,
    counterThreat,
    emotional,
    sterile,
    offensiveSurge,
    goalWindow,
    marketLag,
    accelerated,
  };
}

function resolveOffensiveControl(
  home: SideMetrics,
  away: SideMetrics,
  homePressure: number,
  awayPressure: number
): OffensiveControlSide {
  const possGap =
    home.possession != null && away.possession != null
      ? home.possession - away.possession
      : null;
  const daGap = home.dangerousAttacks - away.dangerousAttacks;
  const sotGap = home.shotsOnTarget - away.shotsOnTarget;
  const pressureGap = homePressure - awayPressure;

  if (possGap != null && Math.abs(possGap) >= 8) {
    return possGap > 0 ? "HOME" : "AWAY";
  }
  if (Math.abs(daGap) >= 4) return daGap > 0 ? "HOME" : "AWAY";
  if (Math.abs(sotGap) >= 2) return sotGap > 0 ? "HOME" : "AWAY";
  if (Math.abs(pressureGap) >= 10) return pressureGap > 0 ? "HOME" : "AWAY";
  if (Math.abs(daGap) <= 2 && Math.abs(pressureGap) < 8) return "BALANCED";
  return "NEUTRAL";
}

function signalStrengthForProfile(
  profile: TacticalProfile,
  signals: TacticalSignals
): number {
  const map: Partial<Record<TacticalProfile, number>> = {
    MARKET_LAG: signals.marketLag,
    IMMINENT_GOAL_WINDOW: signals.goalWindow,
    FAVORITE_TRAPPED: signals.favoriteTrapped,
    PRESSURE_WITHOUT_FINISHING: Math.max(signals.pressureNoFinish, signals.finishingGap),
    TRANSITION_THREAT: signals.transitionThreat,
    DANGEROUS_COUNTER: signals.counterThreat,
    EMOTIONAL_SWING: signals.emotional,
    ACCELERATED_PACE: signals.accelerated,
    OPEN_EXCHANGE: signals.openExchange,
    STERILE_POSSESSION: signals.sterile,
    EFFECTIVE_LOW_BLOCK: signals.lowBlock,
    TERRITORIAL_DOMINANCE: signals.territorialSkew,
    HIGH_PRESSURE: signals.highPressure,
    TRUNCATED_RHYTHM: signals.truncated,
    REACTIVE_PHASE: signals.reactive,
    OFFENSIVE_SURGE: signals.offensiveSurge,
    PRE_MATCH_OPEN: 70,
    PRE_MATCH_CLOSED: 70,
  };
  return map[profile] ?? 40;
}

/** Fontes insuficientes para narrativa forte de campo. */
export function isWeakTacticalSources(sourcesUsed: string[]): boolean {
  const strong = new Set([
    "stats",
    "teamStats",
    "posse",
    "timeline",
    "xG",
    "sequenciaPressao",
  ]);
  return !sourcesUsed.some((s) => strong.has(s));
}

function isOddsPlacarOnly(sourcesUsed: string[]): boolean {
  const allowed = new Set(["oddsMovement", "placar", "minuto"]);
  return (
    sourcesUsed.length > 0 && sourcesUsed.every((s) => allowed.has(s))
  );
}

/** Narrativas únicas derivadas do fingerprint do fixture (stats + placar + minuto). */
function buildContextualNarratives(
  match: Match,
  input: TacticalMatchReaderInput,
  home: SideMetrics,
  away: SideMetrics,
  minute: number
): NarrativePick[] {
  const out: NarrativePick[] = [];
  const homeName = shortName(match.homeTeam);
  const awayName = shortName(match.awayTeam);
  const daGap = home.dangerousAttacks - away.dangerousAttacks;
  const sotGap = home.shotsOnTarget - away.shotsOnTarget;
  const possGap =
    home.possession != null && away.possession != null
      ? home.possession - away.possession
      : 0;
  const scoreDiff =
    input.scoreKnown && input.homeScore != null && input.awayScore != null
      ? input.homeScore - input.awayScore
      : 0;
  const totalGoals =
    input.scoreKnown && input.homeScore != null && input.awayScore != null
      ? input.homeScore + input.awayScore
      : 0;

  if (input.isPreMatch) {
    const over05 = match.odds.over05;
    const over15 = match.odds.over15;
    const open05 = over05 >= 1.01 ? Math.round((1 / over05) * 72) : 50;
    const open15 = over15 >= 1.01 ? Math.round((1 / over15) * 55) : 40;
    const spread = open05 - open15;
    if (spread >= 18) {
      out.push({
        profile: "PRE_MATCH_OPEN",
        text: `Expectativa pré-jogo: mercado vê jogo aberto (over 0.5 ~${open05}%).`,
        priority: 86,
        reason: `spread over05-over15 ${spread}`,
      });
    } else if (open05 <= 38) {
      out.push({
        profile: "PRE_MATCH_CLOSED",
        text: `Expectativa pré-jogo: partida fechada no papel (over 0.5 ~${open05}%).`,
        priority: 85,
        reason: `over 0.5 implícito ${open05}%`,
      });
    } else {
      out.push({
        profile: "NEUTRAL_RHYTHM",
        text: `Expectativa pré-jogo: ritmo moderado — over 0.5 ~${open05}%, over 1.5 ~${open15}%.`,
        priority: 72,
        reason: "odds pré-jogo sem extremo aberto/fechado",
      });
    }
    if (input.steamMove || (input.oddsDrift != null && Math.abs(input.oddsDrift) >= 0.03)) {
      out.push({
        profile: "MARKET_LAG",
        text: "Expectativa: mercado já se movimenta antes do apito.",
        priority: 88,
        reason: "steam/drift pré-jogo",
      });
    }
    return out;
  }

  if (Math.abs(daGap) >= 4) {
    const leader = daGap > 0 ? homeName : awayName;
    const leaderDa = daGap > 0 ? home.dangerousAttacks : away.dangerousAttacks;
    const trailerDa = daGap > 0 ? away.dangerousAttacks : home.dangerousAttacks;
    out.push({
      profile: "TERRITORIAL_DOMINANCE",
      text: `${leader} lidera volume ofensivo (${leaderDa} vs ${trailerDa} ataques perigosos).`,
      priority: 78 + Math.min(Math.abs(daGap), 18),
      reason: `DA gap ${daGap}`,
      contextual: true,
    });
  }

  if (possGap >= 10 && sotGap <= 0 && home.shotsOnTarget + away.shotsOnTarget <= 4) {
    const possLeader = possGap > 0 ? homeName : awayName;
    out.push({
      profile: "STERILE_POSSESSION",
      text: `${possLeader} com posse (${Math.max(home.possession ?? 0, away.possession ?? 0)}%) mas pouca finalização.`,
      priority: 80 + Math.min(Math.abs(possGap), 12),
      reason: `posse gap ${possGap} · SOT total ${home.shotsOnTarget + away.shotsOnTarget}`,
      contextual: true,
    });
  }

  if (input.scoreKnown && scoreDiff > 0 && daGap <= -4) {
    out.push({
      profile: "FAVORITE_TRAPPED",
      text: `${homeName} na frente no placar, mas ${awayName} domina ataques (${away.dangerousAttacks} DA).`,
      priority: 88 + Math.min(Math.abs(daGap), 10),
      reason: `placar +${scoreDiff} · DA visitante ${away.dangerousAttacks}`,
      contextual: true,
    });
  } else if (input.scoreKnown && scoreDiff < 0 && daGap >= 4) {
    out.push({
      profile: "FAVORITE_TRAPPED",
      text: `${awayName} na frente, mas ${homeName} impõe ritmo (${home.dangerousAttacks} DA).`,
      priority: 88 + Math.min(Math.abs(daGap), 10),
      reason: `placar ${scoreDiff} · DA casa ${home.dangerousAttacks}`,
      contextual: true,
    });
  } else if (input.scoreKnown && scoreDiff < 0 && daGap <= -4) {
    out.push({
      profile: "FAVORITE_TRAPPED",
      text: `${awayName} vence no placar e lidera ataques (${away.dangerousAttacks} vs ${home.dangerousAttacks} DA).`,
      priority: 90 + Math.min(Math.abs(daGap), 10),
      reason: `placar ${scoreDiff} · visitante domina DA`,
      contextual: true,
    });
  } else if (input.scoreKnown && scoreDiff > 0 && daGap >= 4) {
    out.push({
      profile: "EFFECTIVE_LOW_BLOCK",
      text: `${homeName} na frente com menos volume — retranca efetiva até aqui.`,
      priority: 86,
      reason: `placar +${scoreDiff} · DA casa ${home.dangerousAttacks}`,
      contextual: true,
    });
  }

  if (
    input.awayPressure > input.homePressure + 12 &&
    away.shotsOnTarget >= 2 &&
    away.dangerousAttacks >= 4
  ) {
    out.push({
      profile: "TRANSITION_THREAT",
      text: `${awayName} joga em transição — pressão ${Math.round(input.awayPressure)} vs ${Math.round(input.homePressure)}.`,
      priority: 84 + Math.round(input.awayPressure - input.homePressure),
      reason: "pressão visitante + SOT visitante",
      contextual: true,
    });
  } else if (
    input.homePressure > input.awayPressure + 12 &&
    home.shotsOnTarget >= 2 &&
    home.dangerousAttacks >= 4
  ) {
    out.push({
      profile: "TRANSITION_THREAT",
      text: `${homeName} acelera no ritmo — pressão ${Math.round(input.homePressure)} vs ${Math.round(input.awayPressure)}.`,
      priority: 84 + Math.round(input.homePressure - input.awayPressure),
      reason: "pressão mandante + SOT casa",
      contextual: true,
    });
  }

  if (match.stats.xG != null && match.stats.xG >= 1.0 && match.stats.shotsOnTarget >= 4) {
    out.push({
      profile: "OFFENSIVE_SURGE",
      text: `xG agregado ${match.stats.xG.toFixed(2)} com ${match.stats.shotsOnTarget} finalizações — janela ofensiva real.`,
      priority: 77 + Math.round(match.stats.xG * 8),
      reason: `xG ${match.stats.xG} · SOT ${match.stats.shotsOnTarget}`,
      contextual: true,
    });
  }

  if (minute >= 70 && input.scoreKnown && Math.abs(scoreDiff) <= 1 && input.pressureScore >= 55) {
    out.push({
      profile: "IMMINENT_GOAL_WINDOW",
      text: `Fim de jogo (${minute}') equilibrado ${input.homeScore}–${input.awayScore} — cada lance pesa.`,
      priority: 86 + (90 - minute),
      reason: `min ${minute} · placar apertado`,
      contextual: true,
    });
  }

  if (totalGoals >= 2 && match.stats.corners >= 6) {
    out.push({
      profile: "OPEN_EXCHANGE",
      text: `Jogo aberto: ${totalGoals} gols e ${match.stats.corners} escanteios até o min ${minute}.`,
      priority: 74 + totalGoals * 6,
      reason: `gols ${totalGoals} · escanteios ${match.stats.corners}`,
      contextual: true,
    });
  }

  if (
    minute >= 25 &&
    match.stats.shots < 7 &&
    match.stats.dangerousAttacks < 10 &&
    input.pressureScore < 50
  ) {
    out.push({
      profile: "TRUNCATED_RHYTHM",
      text: `Jogo truncado no min ${minute} — ${match.stats.shots} chutes e ${match.stats.dangerousAttacks} DA.`,
      priority: 76,
      reason: "volume ofensivo baixo",
      contextual: true,
    });
  }

  if (input.steamMove && input.pressureScore >= 50) {
    out.push({
      profile: "MARKET_LAG",
      text: `Mercado reagindo (steam) com pressão ${input.pressureScore} em campo.`,
      priority: 82,
      reason: "steam + pressão",
      contextual: true,
    });
  } else if (
    input.pressureScore >= 58 &&
    !input.steamMove &&
    (input.oddsDrift == null || Math.abs(input.oddsDrift) < 0.03)
  ) {
    out.push({
      profile: "MARKET_LAG",
      text: "Mercado ainda não reagiu à pressão recente em campo.",
      priority: 80,
      reason: "pressão alta sem drift/steam",
      contextual: true,
    });
  }

  if (
    possGap >= 12 &&
    home.shotsOnTarget + away.shotsOnTarget <= 6 &&
    minute >= 20
  ) {
    const possLeader = possGap > 0 ? homeName : awayName;
    out.push({
      profile: "STERILE_POSSESSION",
      text: `${possLeader} com ${Math.max(home.possession ?? 0, away.possession ?? 0)}% de posse e poucas finalizações.`,
      priority: 84,
      reason: `posse ${possGap}% · SOT ${home.shotsOnTarget + away.shotsOnTarget}`,
      contextual: true,
    });
  }

  return out;
}

function selectBestNarrative(
  narratives: NarrativePick[],
  signals: TacticalSignals
): NarrativePick | null {
  if (narratives.length === 0) return null;

  const scored = narratives.map((n) => {
    const strength = signalStrengthForProfile(n.profile, signals);
    let composite = n.priority * (0.45 + (strength / 100) * 0.55);
    if (n.contextual) {
      composite *= 1.32;
    }
    if (n.profile === "HIGH_PRESSURE") {
      composite *= 0.72;
    }
    return { ...n, composite, strength };
  });

  const maxNonPressure = Math.max(
    0,
    ...scored
      .filter((s) => s.profile !== "HIGH_PRESSURE")
      .map((s) => s.composite)
  );

  const eligible = scored.filter((s) => {
    if (s.profile !== "HIGH_PRESSURE") return true;
    return (
      s.strength >= 72 &&
      s.composite >= maxNonPressure + 3
    );
  });

  eligible.sort((a, b) => b.composite - a.composite);
  return eligible[0] ?? scored.sort((a, b) => b.composite - a.composite)[0] ?? null;
}

function applyReadingGuards(
  intel: TacticalMatchIntelligence,
  input: TacticalMatchReaderInput,
  sourcesUsed: string[]
): TacticalMatchIntelligence {
  if (input.isPreMatch) {
    return {
      ...intel,
      limitedReading: intel.confidence < 40,
      narrativeTier: "expectation",
    };
  }

  const weak = isWeakTacticalSources(sourcesUsed) || isOddsPlacarOnly(sourcesUsed);
  const lowConf = intel.confidence < 40;

  if (lowConf) {
    return {
      ...intel,
      tacticalProfile: "LOW_DATA",
      tacticalNarrative:
        "Leitura tática limitada — aguarde mais stats, eventos ou timeline do jogo.",
      profileLabel: PROFILE_LABELS.LOW_DATA,
      limitedReading: true,
      narrativeTier: "soft",
      reasoning: `${intel.reasoning} · confiança ${intel.confidence} abaixo do limiar`,
    };
  }

  if (weak) {
    return {
      ...intel,
      tacticalNarrative:
        "Leitura tática preliminar — ainda sem stats de campo suficientes para padrão claro.",
      limitedReading: true,
      narrativeTier: "soft",
      tacticalProfile:
        intel.tacticalProfile === "HIGH_PRESSURE"
          ? "NEUTRAL_RHYTHM"
          : intel.tacticalProfile,
      profileLabel:
        intel.tacticalProfile === "HIGH_PRESSURE"
          ? PROFILE_LABELS.NEUTRAL_RHYTHM
          : intel.profileLabel,
      reasoning: `${intel.reasoning} · fontes fracas (${sourcesUsed.join(", ")})`,
    };
  }

  return {
    ...intel,
    limitedReading: false,
    narrativeTier: "strong",
  };
}

function resolveVolatility(
  chaosIndex: number,
  totalGoals: number,
  openScore: number
): VolatilityProfile {
  if (openScore >= 65 || (totalGoals >= 3 && chaosIndex >= 45)) return "OPEN";
  if (chaosIndex >= 68) return "CHAOTIC";
  if (chaosIndex <= 28 && totalGoals <= 1) return "CONTROLLED";
  return "STABLE";
}

function buildNarratives(
  match: Match,
  input: TacticalMatchReaderInput,
  signals: TacticalSignals,
  home: SideMetrics,
  away: SideMetrics,
  minute: number
): NarrativePick[] {
  const homeName = shortName(match.homeTeam);
  const awayName = shortName(match.awayTeam);
  const out: NarrativePick[] = [];

  if (input.isPreMatch) {
    return out;
  }

  if (signals.marketLag >= 55) {
    out.push({
      profile: "MARKET_LAG",
      text: "Mercado ainda não reagiu à pressão recente.",
      priority: 94,
      reason: `pressão em alta sem steam/drift · edge ${input.edgePercent ?? 0}%`,
    });
  }

  if (signals.goalWindow >= 60) {
    out.push({
      profile: "IMMINENT_GOAL_WINDOW",
      text: "Risco de gol iminente — janela decisiva no fim de jogo.",
      priority: 93,
      reason: `min ${minute} · pressão ${input.pressureScore} · placar apertado`,
    });
  }

  if (signals.favoriteTrapped >= 65) {
    const text =
      input.dominanceLabel === "HOME_DOMINANT" && input.scoreKnown
        ? `${homeName} controla território mas o placar favorece o visitante.`
        : input.dominanceLabel === "AWAY_DOMINANT"
          ? `${awayName} domina campo, mas o favorito segue atrás no placar.`
          : "Favorito pressionando sem transformar em chances reais.";
    out.push({
      profile: "FAVORITE_TRAPPED",
      text,
      priority: 92,
      reason: `dominance ${input.dominanceLabel} vs placar`,
    });
  }

  if (signals.finishingGap >= 60 || signals.pressureNoFinish >= 58) {
    out.push({
      profile: "PRESSURE_WITHOUT_FINISHING",
      text:
        home.possession != null && home.possession >= 58
          ? `${homeName} controla território mas finaliza pouco.`
          : "Favorito pressionando sem transformar em chances reais.",
      priority: 91,
      reason: "posse/ataques altos com baixa eficiência de finalização",
    });
  }

  if (signals.transitionThreat >= 58) {
    out.push({
      profile: "TRANSITION_THREAT",
      text: `${awayName} joga em transição e ameaça contra-ataques.`,
      priority: 90,
      reason: `pressão visitante ${input.awayPressure} · DA visitante ${away.dangerousAttacks}`,
    });
  }

  if (signals.counterThreat >= 62) {
    const counterSide =
      input.awayPressure > input.homePressure ? awayName : homeName;
    out.push({
      profile: "DANGEROUS_COUNTER",
      text: `${counterSide} ameaça em transição com finalizações perigosas.`,
      priority: 89,
      reason: "pico de pressão lateral + SOT relevantes",
    });
  }

  if (signals.emotional >= 58) {
    out.push({
      profile: "EMOTIONAL_SWING",
      text: "Jogo emocional após lances recentes (gol ou cartão).",
      priority: 88,
      reason: "eventos na timeline nos últimos 10 min",
    });
  }

  if (signals.accelerated >= 58) {
    out.push({
      profile: "ACCELERATED_PACE",
      text: "Ritmo muito acelerado para o minuto atual.",
      priority: 87,
      reason: `DA/min elevado no min ${minute}`,
    });
  }

  if (signals.openExchange >= 55) {
    out.push({
      profile: "OPEN_EXCHANGE",
      text: "Jogo aberto — troca de ataques e volatilidade alta.",
      priority: 86,
      reason: `chaos ${input.chaosIndex} · gols no placar`,
    });
  }

  if (signals.sterile >= 55) {
    out.push({
      profile: "STERILE_POSSESSION",
      text: `${homeName} com posse, mas pouca finalização — controle estéril.`,
      priority: 85,
      reason: `posse ${home.possession ?? "n/a"}% · SOT agregado ${match.stats.shotsOnTarget}`,
    });
  }

  if (signals.lowBlock >= 58) {
    out.push({
      profile: "EFFECTIVE_LOW_BLOCK",
      text: "Retranca efetiva — menos volume, mas resultado favorável.",
      priority: 84,
      reason: "menos ataques que o rival com vantagem no placar",
    });
  }

  if (signals.territorialSkew >= 60) {
    const homeTerritorial =
      (home.possession != null && home.possession >= 55) ||
      home.dangerousAttacks > away.dangerousAttacks + 5;
    out.push({
      profile: "TERRITORIAL_DOMINANCE",
      text: homeTerritorial
        ? `${homeName} domina território e volume ofensivo.`
        : `${awayName} domina território e volume ofensivo.`,
      priority: 82,
      reason: "diferença de posse e ataques perigosos",
    });
  }

  if (signals.highPressure >= 78 && input.pressureScore >= 82) {
    out.push({
      profile: "HIGH_PRESSURE",
      text: `Pressão muito alta (${input.pressureScore}) — jogo exige atenção imediata.`,
      priority: 62,
      reason: `índice de pressão ${input.pressureScore}`,
    });
  }

  if (signals.truncated >= 55) {
    out.push({
      profile: "TRUNCATED_RHYTHM",
      text: "Jogo truncado — poucos ataques e ritmo baixo.",
      priority: 78,
      reason: `chutes ${match.stats.shots} · DA ${match.stats.dangerousAttacks}`,
    });
  }

  if (signals.reactive >= 48) {
    out.push({
      profile: "REACTIVE_PHASE",
      text: "Jogo reativo — ritmo caiu após o último lance decisivo.",
      priority: 76,
      reason: "pressão em queda após evento recente",
    });
  }

  if (signals.offensiveSurge >= 58) {
    out.push({
      profile: "OFFENSIVE_SURGE",
      text: "Intensidade ofensiva em alta nos últimos minutos.",
      priority: 74,
      reason: `momentum ${input.momentum} · DA ${match.stats.dangerousAttacks}`,
    });
  }

  return out;
}

function computeTransitionRisk(
  signals: TacticalSignals,
  awayPressure: number,
  homePressure: number,
  sequenceState: string | null
): number {
  let risk = signals.transitionThreat * 0.45 + signals.counterThreat * 0.35;
  if (awayPressure > homePressure + 10) risk += 12;
  if (sequenceState?.includes("ESCALAT")) risk += 14;
  return clamp(Math.round(risk), 0, 100);
}

function computeEmotionalTemperature(
  signals: TacticalSignals,
  recentGoalCount: number,
  recentCardCount: number,
  chaosIndex: number
): number {
  return clamp(
    Math.round(
      signals.emotional * 0.55 +
        recentGoalCount * 18 +
        recentCardCount * 10 +
        chaosIndex * 0.2
    ),
    0,
    100
  );
}

function computeTacticalIntensity(
  input: TacticalMatchReaderInput,
  signals: TacticalSignals
): number {
  return clamp(
    Math.round(
      input.pressureScore * 0.35 +
        input.momentum * 0.25 +
        signals.highPressure * 0.15 +
        signals.offensiveSurge * 0.15 +
        signals.openExchange * 0.1
    ),
    0,
    100
  );
}

/**
 * Lê o perfil tático do jogo a partir de dados observáveis.
 */
export function readTacticalMatch(
  input: TacticalMatchReaderInput
): TacticalMatchIntelligence {
  const { match } = input;
  const minute = input.minute ?? match.minute ?? 0;
  const { home, away, hasTeamStats, hasRealPossession } = resolveSideMetrics(
    match,
    input.homePressure,
    input.awayPressure
  );

  const timeline = match.premium?.timelineEvents ?? [];
  const hasTimeline = timeline.length > 0;
  const hasStats =
    match.stats.shots > 0 ||
    match.stats.dangerousAttacks > 0 ||
    match.stats.shotsOnTarget > 0;
  const history = getPressureScoreHistory(match.id);
  const hasPressureHistory = history.length >= 2;
  const hasMarket =
    input.steamMove ||
    (input.oddsDrift != null && Math.abs(input.oddsDrift) >= 0.02) ||
    match.odds.primary >= 1.05;

  const sourcesUsed = collectSources(match, input, {
    hasTeamStats,
    hasRealPossession,
    hasTimeline,
    hasStats,
    hasPressureHistory,
    hasMarket,
  });

  const confidence = assessConfidence(
    sourcesUsed,
    input.isPreMatch,
    hasTeamStats,
    hasTimeline,
    minute
  );

  if (sourcesUsed.length < 2 && !input.isPreMatch) {
    return applyReadingGuards(
      {
        tacticalProfile: "LOW_DATA",
        tacticalNarrative: "Leitura tática limitada — aguarde mais stats ou eventos.",
        tacticalIntensity: 0,
        offensiveControl: "NEUTRAL",
        emotionalTemperature: 0,
        transitionRisk: 0,
        volatilityProfile: "STABLE",
        confidence: clamp(confidence, 0, 32),
        sourcesUsed,
        reasoning: "menos de 2 fontes táticas disponíveis",
        profileLabel: PROFILE_LABELS.LOW_DATA,
        limitedReading: true,
        narrativeTier: "soft",
      },
      input,
      sourcesUsed
    );
  }

  const signals = detectSignals(match, input, home, away, minute);
  const narratives = [
    ...buildContextualNarratives(match, input, home, away, minute),
    ...buildNarratives(match, input, signals, home, away, minute),
  ];
  const pick = selectBestNarrative(narratives, signals);

  const totalGoals =
    input.scoreKnown && input.homeScore != null && input.awayScore != null
      ? input.homeScore + input.awayScore
      : 0;

  const recent = recentEvents(timeline, minute, 10);
  const recentGoals = recent.filter((e) => isGoalEvent(e.type)).length;
  const recentCards = recent.filter((e) => isCardEvent(e.type)).length;

  const tacticalNarrative =
    pick?.text ??
    (input.isPreMatch
      ? "Aguardando início para leitura tática em campo."
      : "Ritmo equilibrado — sem padrão tático dominante claro.");

  const profileScores: [TacticalProfile, number][] = [
    ["MARKET_LAG", signals.marketLag],
    ["IMMINENT_GOAL_WINDOW", signals.goalWindow],
    ["FAVORITE_TRAPPED", signals.favoriteTrapped],
    ["PRESSURE_WITHOUT_FINISHING", signals.pressureNoFinish],
    ["TRANSITION_THREAT", signals.transitionThreat],
    ["DANGEROUS_COUNTER", signals.counterThreat],
    ["EMOTIONAL_SWING", signals.emotional],
    ["ACCELERATED_PACE", signals.accelerated],
    ["OPEN_EXCHANGE", signals.openExchange],
    ["STERILE_POSSESSION", signals.sterile],
    ["EFFECTIVE_LOW_BLOCK", signals.lowBlock],
    ["TERRITORIAL_DOMINANCE", signals.territorialSkew],
    ["HIGH_PRESSURE", signals.highPressure],
    ["TRUNCATED_RHYTHM", signals.truncated],
    ["REACTIVE_PHASE", signals.reactive],
    ["OFFENSIVE_SURGE", signals.offensiveSurge],
  ];
  profileScores.sort((a, b) => b[1] - a[1]);
  const resolvedProfile: TacticalProfile = pick
    ? pick.profile
    : (profileScores[0]?.[1] ?? 0) >= 50
      ? profileScores[0]![0]
      : "NEUTRAL_RHYTHM";

  const reasoning =
    pick?.reason ??
    `sinais fracos — topo ${profileScores[0]?.[0] ?? "NEUTRAL"} ${profileScores[0]?.[1] ?? 0}`;

  const tacticalIntensity = computeTacticalIntensity(input, signals);
  const offensiveControl = resolveOffensiveControl(
    home,
    away,
    input.homePressure,
    input.awayPressure
  );
  const emotionalTemperature = computeEmotionalTemperature(
    signals,
    recentGoals,
    recentCards,
    input.chaosIndex
  );
  const transitionRisk = computeTransitionRisk(
    signals,
    input.awayPressure,
    input.homePressure,
    input.sequenceState
  );
  const volatilityProfile = resolveVolatility(
    input.chaosIndex,
    totalGoals,
    signals.openExchange
  );

  const signalPeak = Math.max(...Object.values(signals));
  const confAdjusted = clamp(
    Math.round(
      (confidence < 45 ? confidence * 0.9 : confidence) +
        Math.min(14, signalPeak * 0.12) +
        Math.min(8, minute * 0.12) +
        (hasTeamStats ? 4 : 0) +
        (hasTimeline ? 5 : 0)
    ),
    0,
    100
  );

  return applyReadingGuards(
    {
      tacticalProfile: resolvedProfile,
      tacticalNarrative,
      tacticalIntensity,
      offensiveControl,
      emotionalTemperature,
      transitionRisk,
      volatilityProfile,
      confidence: confAdjusted,
      sourcesUsed,
      reasoning: `${reasoning} · fontes: ${sourcesUsed.join(", ") || "nenhuma"}`,
      profileLabel: PROFILE_LABELS[resolvedProfile],
      limitedReading: false,
      narrativeTier: input.isPreMatch ? "expectation" : "strong",
    },
    input,
    sourcesUsed
  );
}

export interface TacticalIntelligenceDebugEntry {
  fixtureId: string;
  matchLabel: string;
  status: "live" | "pre" | "other";
  tacticalProfile: TacticalProfile;
  narrative: string;
  sourcesUsed: string[];
  confidence: number;
  reasoning: string;
  tacticalIntensity: number;
  offensiveControl: OffensiveControlSide;
  emotionalTemperature: number;
  transitionRisk: number;
  volatilityProfile: VolatilityProfile;
  limitedReading: boolean;
  narrativeTier: TacticalNarrativeTier;
}

export function tacticalToDebugEntry(
  fixtureId: string,
  matchLabel: string,
  intel: TacticalMatchIntelligence,
  status: "live" | "pre" | "other" = "live"
): TacticalIntelligenceDebugEntry {
  return {
    fixtureId,
    matchLabel,
    status,
    tacticalProfile: intel.tacticalProfile,
    narrative: intel.tacticalNarrative,
    sourcesUsed: intel.sourcesUsed,
    confidence: intel.confidence,
    reasoning: intel.reasoning,
    tacticalIntensity: intel.tacticalIntensity,
    offensiveControl: intel.offensiveControl,
    emotionalTemperature: intel.emotionalTemperature,
    transitionRisk: intel.transitionRisk,
    volatilityProfile: intel.volatilityProfile,
    limitedReading: intel.limitedReading,
    narrativeTier: intel.narrativeTier,
  };
}
