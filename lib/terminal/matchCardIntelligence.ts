/**
 * Inteligência contextual por card — deriva métricas e narrativas do fixture real.
 * Não altera engines de runtime; sintetiza leitura quando ops está ausente ou homogêneo.
 */

import type { Match } from "@/types/domain";
import { calculateFixtureTeamPressures } from "@/lib/engine/pressureScore";
import { getPressureScoreHistory } from "@/lib/engine/pressure/rollingWindow";
import type { OperationalState, SteamDirection } from "@/lib/signals/executionWindow";
import {
  buildCardIntelligenceAudit,
  type CardAuditDraft,
  type CardIntelligenceAudit,
} from "@/lib/terminal/cardIntelligenceAudit";

export type { CardIntelligenceAudit, CardAuditDraft };

export type DataQualityLevel = "rich" | "partial" | "sparse";

export interface MatchCardIntelligenceInput {
  match: Match;
  fixtureId: string;
  isLive: boolean;
  isPreMatch: boolean;
  homeScore: number | null;
  awayScore: number | null;
  scoreKnown: boolean;
  minute: number | null;
  opsPressure?: {
    homePressure: number;
    awayPressure: number;
    pressureScore: number;
    momentum: number;
    confidence: number;
  } | null;
  chaosFromOps: number;
  sequenceState: string | null;
  temporalPhase: string | null;
  microeventScore: number | null;
  topEdge?: {
    edgePercent: number;
    steamMove: boolean;
    oddsDrift: number | null;
    fairOdd?: number | null;
    marketOdd?: number | null;
  } | null;
  metaConfidence?: number | null;
  validationScore: number;
  pressureHistory?: number[];
  premiumFeed: boolean;
  hasTeamStats: boolean;
  dominanceLabel: string;
  fpRisk: number;
  staleRisk: number;
  steamDirection: SteamDirection;
}

export interface MatchCardIntelligence {
  pressureScore: number;
  homePressure: number;
  awayPressure: number;
  momentum: number;
  chaosIndex: number;
  confidence: number;
  edgePercent: number | null;
  dataQuality: DataQualityLevel;
  lowConfidence: boolean;
  primaryInsight: string;
  secondaryInsight: string | null;
  intensityLabel: string;
  volatilityLabel: string;
  dominanceNarrative: string | null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function impliedGoalOpenness(over05: number): number {
  if (over05 < 1.01) return 50;
  const imp = 1 / over05;
  return clamp(Math.round(imp * 72), 8, 88);
}

function assessDataQuality(
  match: Match,
  hasOps: boolean,
  premiumFeed: boolean,
  hasTeamStats: boolean
): DataQualityLevel {
  const stats = match.stats;
  let signals = 0;
  if (stats.shots > 0) signals++;
  if (stats.dangerousAttacks > 0) signals++;
  if (stats.shotsOnTarget > 0) signals++;
  if ((stats.possession ?? 0) > 0 && stats.possession !== 50) signals++;
  if ((stats.xG ?? 0) > 0) signals++;
  if (hasTeamStats) signals += 2;
  if (hasOps) signals += 2;
  if (premiumFeed) signals++;
  if ((match.oddsQuotes?.length ?? 0) > 0) signals++;
  if (match.odds.primary >= 1.05) signals++;

  if (signals >= 7) return "rich";
  if (signals >= 3) return "partial";
  return "sparse";
}

function computeFieldMetrics(match: Match, minute: number) {
  const teams = calculateFixtureTeamPressures(match);
  const agg = teams.aggregate;
  return {
    pressureScore: agg.pressureScore,
    homePressure: teams.home,
    awayPressure: teams.away,
    momentum: agg.momentum,
    offensiveIntensity: agg.offensiveIntensity,
    goalProbability: agg.goalProbability,
    fieldConfidence: Math.round(agg.confidence * 100),
  };
}

/** Volatilidade / “chaos” derivado do jogo + mercado (não constante 0). */
function computeContextualChaos(
  match: Match,
  input: MatchCardIntelligenceInput,
  fieldPressure: number
): number {
  const opsChaos = input.chaosFromOps;
  if (opsChaos >= 12) {
    return clamp(Math.round(opsChaos * 0.7 + fieldPressure * 0.15), 0, 100);
  }

  const minute = input.minute ?? match.minute ?? 0;
  const stats = match.stats;
  const totalGoals =
    input.scoreKnown && input.homeScore != null && input.awayScore != null
      ? input.homeScore + input.awayScore
      : 0;
  const goalDiff =
    input.scoreKnown && input.homeScore != null && input.awayScore != null
      ? Math.abs(input.homeScore - input.awayScore)
      : 0;

  const attackVol = clamp(
    stats.dangerousAttacks * 2.2 + stats.shotsOnTarget * 4 + stats.shots * 1.2,
    0,
    55
  );
  const minuteStress =
    minute >= 75 && goalDiff <= 1 ? 22 : minute >= 60 && totalGoals >= 2 ? 14 : 0;
  const scoreOpenness = totalGoals >= 3 ? 28 : totalGoals === 2 ? 16 : totalGoals === 1 ? 8 : 0;
  const micro = (input.microeventScore ?? 0) * 0.35;
  const seq =
    input.sequenceState === "ESCALATING"
      ? 18
      : input.sequenceState?.includes("CHAOS")
        ? 14
        : 0;

  const marketVol = input.topEdge?.steamMove
    ? 20
    : input.topEdge?.oddsDrift != null && Math.abs(input.topEdge.oddsDrift) >= 0.04
      ? 12
      : 0;

  const preOpenness = input.isPreMatch
    ? Math.abs(impliedGoalOpenness(match.odds.over05) - impliedGoalOpenness(match.odds.over15)) * 0.4
    : 0;

  return clamp(
    Math.round(
      attackVol +
        minuteStress +
        scoreOpenness +
        micro +
        seq +
        marketVol +
        preOpenness +
        fieldPressure * 0.12
    ),
    0,
    100
  );
}

function computeContextualMomentum(
  match: Match,
  fieldMomentum: number,
  input: MatchCardIntelligenceInput,
  pressureScore: number
): number {
  const history = getPressureScoreHistory(match.id);
  const histDelta =
    history.length >= 2
      ? history[history.length - 1]! - history[history.length - 2]!
      : input.pressureHistory && input.pressureHistory.length >= 2
        ? input.pressureHistory[input.pressureHistory.length - 1]! -
          input.pressureHistory[input.pressureHistory.length - 2]!
        : 0;

  const trendBoost =
    match.pressure.trend === "RISING"
      ? 10
      : match.pressure.trend === "FALLING"
        ? -8
        : 0;
  const steamBoost = input.topEdge?.steamMove ? 14 : 0;
  const microBoost = (input.microeventScore ?? 0) >= 55 ? 12 : 0;

  const blended = Math.round(
    fieldMomentum * 0.45 +
      (input.opsPressure?.momentum ?? 0) * 0.25 +
      clamp(histDelta * 4, -15, 20) +
      trendBoost +
      steamBoost +
      microBoost +
      pressureScore * 0.08
  );

  return clamp(blended, 0, 100);
}

function computeContextualConfidence(
  match: Match,
  fieldConfidence: number,
  dataQuality: DataQualityLevel,
  input: MatchCardIntelligenceInput
): number {
  let score = 0;
  const weights: number[] = [];

  if (input.metaConfidence != null && input.metaConfidence > 0) {
    score += input.metaConfidence * 0.35;
    weights.push(0.35);
  }
  if (input.opsPressure && input.opsPressure.confidence > 0) {
    score += input.opsPressure.confidence * 0.3;
    weights.push(0.3);
  }
  score += fieldConfidence * 0.25;
  weights.push(0.25);

  score += input.validationScore * 0.15;
  weights.push(0.15);

  const wSum = weights.reduce((a, b) => a + b, 0) || 1;
  let conf = score / wSum;

  if (dataQuality === "sparse") conf *= 0.42;
  else if (dataQuality === "partial") conf *= 0.72;

  conf -= input.fpRisk * 0.35;
  conf -= input.staleRisk * 0.25;

  if (input.isPreMatch && !input.premiumFeed) conf = Math.min(conf, 38);

  return clamp(Math.round(conf), 0, 100);
}

function pickDominanceNarrative(
  match: Match,
  input: MatchCardIntelligenceInput,
  homeP: number,
  awayP: number
): string | null {
  const diff = homeP - awayP;
  const poss = match.stats.possession ?? 50;
  const homeName = match.homeTeam.split(" ").slice(-1)[0] ?? match.homeTeam;
  const awayName = match.awayTeam.split(" ").slice(-1)[0] ?? match.awayTeam;

  if (diff >= 14 && input.homeScore != null && input.awayScore != null) {
    if (input.homeScore < input.awayScore) {
      return `${homeName} pressiona, mas o placar favorece o visitante.`;
    }
    if (input.homeScore > input.awayScore) {
      return `${homeName} domina os últimos minutos e controla o placar.`;
    }
  }
  if (diff <= -14) {
    if (input.awayScore != null && input.homeScore != null && input.awayScore > input.homeScore) {
      return `${awayName} impõe ritmo e lidera no placar.`;
    }
    if (input.homeScore != null && input.awayScore != null && input.homeScore > input.awayScore) {
      return `${awayName} domina campo, mas ${homeName} segue na frente — favorito sem controle do jogo.`;
    }
    return `${awayName} domina os últimos minutos no campo.`;
  }

  if (poss >= 62 && match.stats.dangerousAttacks >= 8 && (match.stats.shotsOnTarget ?? 0) <= 2) {
    return `${homeName} tem posse, mas pouca finalização — jogo travado.`;
  }

  if (input.dominanceLabel === "HOME_DOMINANT") return `${homeName} com iniciativa clara.`;
  if (input.dominanceLabel === "AWAY_DOMINANT") return `${awayName} com iniciativa clara.`;

  return null;
}

interface InsightCandidate {
  text: string;
  priority: number;
  reason: string;
}

function buildInsightCandidates(
  match: Match,
  input: MatchCardIntelligenceInput,
  metrics: {
    pressureScore: number;
    momentum: number;
    chaosIndex: number;
    homeP: number;
    awayP: number;
  }
): InsightCandidate[] {
  const out: InsightCandidate[] = [];
  const { pressureScore, momentum, chaosIndex, homeP, awayP } = metrics;
  const edge = input.topEdge?.edgePercent ?? null;
  const drift = input.topEdge?.oddsDrift ?? null;
  const steam = input.topEdge?.steamMove ?? false;
  const stats = match.stats;
  const minute = input.minute ?? match.minute ?? 0;

  if (input.isPreMatch) {
    const open = impliedGoalOpenness(match.odds.over05);
    if (open >= 70) {
      out.push({
        text: "Mercado precifica jogo aberto antes do apito.",
        priority: 88,
        reason: `over 0.5 implícito ${open}% (odds pré-jogo)`,
      });
    } else if (open <= 35) {
      out.push({
        text: "Leitura pré-jogo: partida fechada no papel.",
        priority: 86,
        reason: `over 0.5 implícito ${open}% indica jogo fechado`,
      });
    }
    if (edge != null && edge >= 6) {
      out.push({
        text: "Odds pré-jogo com margem detectada pelo modelo.",
        priority: 72,
        reason: `edge ${edge.toFixed(1)}% no mercado calibrado`,
      });
    }
    if (steam || (drift != null && drift < -0.03)) {
      out.push({
        text: "Mercado começando a reagir antes do início.",
        priority: 90,
        reason: steam
          ? "steam move pré-jogo"
          : `drift ${drift != null ? drift.toFixed(3) : "n/a"} nas odds`,
      });
    }
    return out;
  }

  if (steam || input.steamDirection === "DOWN") {
    out.push({
      text: "Mercado acelerando — reação forte às odds.",
      priority: 96,
      reason: `steam=${steam} · direção ${input.steamDirection}`,
    });
  }

  if (edge != null && edge >= 9 && pressureScore < 52) {
    out.push({
      text: "Linha provavelmente atrasada frente ao que o jogo mostra.",
      priority: 94,
      reason: `edge ${edge.toFixed(1)}% com pressão campo só ${pressureScore}`,
    });
  }

  if (momentum >= 68 && pressureScore >= 55) {
    out.push({
      text: "Pressão ofensiva crescente nos últimos minutos.",
      priority: 92,
      reason: `momentum ${momentum} e pressão ${pressureScore}`,
    });
  }

  if (chaosIndex >= 68) {
    out.push({
      text: "Alta volatilidade — jogo imprevisível agora.",
      priority: 90,
      reason: `chaos contextual ${chaosIndex}`,
    });
  }

  if (
    pressureScore < 38 &&
    stats.dangerousAttacks < 6 &&
    stats.shots < 5 &&
    minute > 20
  ) {
    out.push({
      text: "Jogo morno — poucos ataques e ritmo baixo.",
      priority: 88,
      reason: `min ${minute} · DA ${stats.dangerousAttacks} · chutes ${stats.shots}`,
    });
  }

  if (drift != null && drift >= 0.05 && !steam) {
    out.push({
      text: "Mercado esfriou após pico de pressão.",
      priority: 84,
      reason: `drift +${drift.toFixed(3)} sem steam`,
    });
  }

  if (
    input.scoreKnown &&
    input.homeScore != null &&
    input.awayScore != null &&
    awayP > homeP + 12 &&
    input.homeScore > input.awayScore
  ) {
    out.push({
      text: "Favorito sem controle do jogo no momento.",
      priority: 93,
      reason: `casa lidera placar mas pressão visitante ${awayP} vs ${homeP}`,
    });
  }

  if (stats.shotsOnTarget >= 5 && pressureScore >= 60) {
    out.push({
      text: "Finalizações frequentes — janela ofensiva viva.",
      priority: 80,
      reason: `SOT ${stats.shotsOnTarget} · pressão ${pressureScore}`,
    });
  }

  if (input.temporalPhase?.includes("CRITICAL")) {
    out.push({
      text: `Fase decisiva (${input.temporalPhase.replace(/_/g, " ").toLowerCase()}).`,
      priority: 82,
      reason: `fase temporal ${input.temporalPhase}`,
    });
  }

  if (pressureScore >= 75) {
    out.push({
      text: "Pressão ofensiva muito forte em campo.",
      priority: 70,
      reason: `pressão agregada ${pressureScore}`,
    });
  } else if (pressureScore >= 58) {
    out.push({
      text: "Jogo quente — intensidade acima da média.",
      priority: 65,
      reason: `pressão ${pressureScore} acima do limiar moderado`,
    });
  }

  if (edge != null && edge >= 7) {
    out.push({
      text: "Modelo vê margem nas odds neste mercado.",
      priority: 68,
      reason: `edge ${edge.toFixed(1)}%`,
    });
  }

  if (minute >= 78 && Math.abs((input.homeScore ?? 0) - (input.awayScore ?? 0)) <= 1) {
    out.push({
      text: "Final de jogo equilibrado — cada lance pesa.",
      priority: 75,
      reason: `min ${minute} · diferença de gols ≤1`,
    });
  }

  return out;
}

function intensityLabel(score: number, rising: boolean): string {
  if (score >= 78) return rising ? "Intensidade explodindo" : "Intensidade muito alta";
  if (score >= 62) return rising ? "Pressão ofensiva crescente" : "Jogo quente";
  if (score >= 42) return "Ritmo moderado";
  if (score >= 22) return "Jogo morno";
  return "Pouca intensidade";
}

function volatilityLabel(chaos: number): string {
  if (chaos >= 72) return "Alta volatilidade";
  if (chaos >= 52) return "Jogo aberto";
  if (chaos >= 32) return "Ritmo estável";
  return "Cenário controlado";
}

export interface MatchCardIntelligenceBundle {
  intel: MatchCardIntelligence;
  auditDraft: CardAuditDraft;
}

/**
 * Sintetiza leitura única por fixture a partir de dados reais disponíveis.
 */
export function buildMatchCardIntelligence(
  input: MatchCardIntelligenceInput
): MatchCardIntelligenceBundle {
  const { match } = input;
  const minute = input.minute ?? match.minute ?? 0;
  const hasOps = !!input.opsPressure && input.opsPressure.pressureScore > 0;
  const hasTeamStats = input.hasTeamStats || !!match.teamStats;

  const dataQuality = assessDataQuality(
    match,
    hasOps,
    input.premiumFeed,
    hasTeamStats
  );

  const field = computeFieldMetrics(match, minute);

  let pressureScore = field.pressureScore;
  let homePressure = field.homePressure;
  let awayPressure = field.awayPressure;
  let opsWeight: number | null = null;

  if (hasOps && input.opsPressure) {
    opsWeight = dataQuality === "rich" ? 0.65 : 0.45;
    pressureScore = Math.round(
      input.opsPressure.pressureScore * opsWeight + field.pressureScore * (1 - opsWeight)
    );
    homePressure = Math.round(
      input.opsPressure.homePressure * opsWeight + field.homePressure * (1 - opsWeight)
    );
    awayPressure = Math.round(
      input.opsPressure.awayPressure * opsWeight + field.awayPressure * (1 - opsWeight)
    );
  }

  if (input.isPreMatch) {
    const marketOpen = impliedGoalOpenness(match.odds.over05);
    pressureScore = clamp(Math.round(marketOpen * 0.35 + pressureScore * 0.2), 5, 42);
    homePressure = Math.round(pressureScore * 0.52);
    awayPressure = pressureScore - homePressure;
  }

  const chaosIndex = computeContextualChaos(match, input, pressureScore);
  const history = input.pressureHistory ?? getPressureScoreHistory(match.id);
  const rising =
    history.length >= 2
      ? history[history.length - 1]! > history[history.length - 2]! + 2
      : match.pressure.trend === "RISING";

  const momentum = computeContextualMomentum(match, field.momentum, input, pressureScore);
  const confidence = computeContextualConfidence(
    match,
    field.fieldConfidence,
    dataQuality,
    input
  );

  const edgePercent =
    input.topEdge?.edgePercent != null && dataQuality !== "sparse"
      ? input.topEdge.edgePercent
      : input.topEdge?.edgePercent != null && input.topEdge.edgePercent >= 5
        ? input.topEdge.edgePercent
        : null;

  const lowConfidence = confidence < 42 || dataQuality === "sparse";

  const candidates = buildInsightCandidates(input.match, input, {
    pressureScore,
    momentum,
    chaosIndex,
    homeP: homePressure,
    awayP: awayPressure,
  });

  if (lowConfidence && candidates.length === 0) {
    candidates.push({
      text: "Dados insuficientes agora — aguarde mais sinais do jogo ou do mercado.",
      priority: 100,
      reason: `dataQuality ${dataQuality} · confiança ${confidence}`,
    });
  }

  candidates.sort((a, b) => b.priority - a.priority);
  const top = candidates[0];
  const primaryInsight = top?.text ?? intensityLabel(pressureScore, rising);
  const primaryInsightReason =
    top?.reason ??
    (rising
      ? "histórico de pressão em alta"
      : `rótulo de intensidade por pressão ${pressureScore}`);
  const secondaryInsight = candidates[1]?.text ?? null;

  const dominanceNarrative = pickDominanceNarrative(match, input, homePressure, awayPressure);

  const hasMeta = input.metaConfidence != null && input.metaConfidence > 0;
  const hasTemporal = !!input.temporalPhase;
  const hasMicroevent =
    input.microeventScore != null && input.microeventScore > 0;
  const hasSequence = !!input.sequenceState;
  const hasMarketEdge = input.topEdge?.edgePercent != null;

  const intel: MatchCardIntelligence = {
    pressureScore,
    homePressure,
    awayPressure,
    momentum,
    chaosIndex,
    confidence,
    edgePercent,
    dataQuality,
    lowConfidence,
    primaryInsight,
    secondaryInsight,
    intensityLabel: intensityLabel(pressureScore, rising),
    volatilityLabel: volatilityLabel(chaosIndex),
    dominanceNarrative,
  };

  const auditDraft: CardAuditDraft = {
    match,
    input,
    dataQuality,
    hasOps,
    hasTeamStats,
    hasMeta,
    hasTemporal,
    hasMicroevent,
    hasSequence,
    hasMarketEdge,
    primaryInsightReason,
    primaryInsight,
    confidence,
    lowConfidence,
    pressureScore,
    homePressure,
    awayPressure,
    fieldPressure: field.pressureScore,
    opsWeight,
    fieldConfidence: field.fieldConfidence,
  };

  return { intel, auditDraft };
}

/** Completa auditoria após resolver estado operacional. */
export function finalizeMatchCardAudit(
  draft: CardAuditDraft,
  operational: {
    rawOperationalState: OperationalState;
    finalOperationalState: OperationalState;
    stateAdjustedForConfidence: boolean;
  }
): CardIntelligenceAudit {
  return buildCardIntelligenceAudit({
    ...draft,
    ...operational,
  });
}

/** Ajusta estado operacional quando confiança nos dados é baixa. */
export function operationalStateWithConfidence(
  state: OperationalState,
  lowConfidence: boolean,
  dataQuality: DataQualityLevel
): OperationalState {
  if (!lowConfidence) return state;
  if (dataQuality === "sparse") return "WAIT";
  if (state === "EXECUTE") return "MONITOR";
  return state;
}
