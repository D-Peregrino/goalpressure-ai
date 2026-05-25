/**
 * Inteligência operacional viva — prioriza, narra e conduz (UI only, sem engines).
 */

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import {
  capFocusTierForTrust,
  computeMatchTrust,
  softenNarrative,
  trustHeroEligible,
} from "@/lib/ux/dataTrust";
import {
  buildQuantTimeline,
  type QuantTimelineEvent,
} from "@/lib/match/buildQuantTimeline";
import type { LiveSignalEntry, LiveSignalType } from "@/lib/signals/liveSignalBuilder";
import {
  ESTADO_JOGO,
  rotuloIntensidade,
  rotuloVantagem,
} from "@/lib/ux/sportsLanguage";
import type { OperationalState } from "@/lib/signals/executionWindow";
import { temperatureToMoment } from "@/lib/engine/ops/classifyMatchTemperature";
import type { MatchTemperature } from "@/lib/engine/ops/ops.types";

export type MomentLevel = "calm" | "warm" | "hot" | "ignite";

/** Hierarquia cognitiva do card — frio → quente */
export type CardFocusTier = "cold" | "warm" | "hot" | "ignite";

export function getMatchFocusScore(m: EnrichedLiveMatch): number {
  return scoreMatch(m);
}

function tierFromOpsTemperature(temp?: string): CardFocusTier | null {
  if (!temp) return null;
  const map: Record<string, CardFocusTier> = {
    IGNITE: "ignite",
    HOT: "hot",
    WARM: "warm",
    COLD: "cold",
  };
  return map[temp] ?? null;
}

export function getCardFocusTier(m: EnrichedLiveMatch): CardFocusTier {
  if (m.isPreMatch) return "cold";
  const opsTier = tierFromOpsTemperature(m.opsTemperature);
  const s = scoreMatch(m);
  let tier: CardFocusTier = opsTier ?? "cold";
  if (!opsTier) {
    if (s >= 88) tier = "ignite";
    else if (s >= 62) tier = "hot";
    else if (s >= 38) tier = "warm";
  }
  const trust = computeMatchTrust(m);
  return capFocusTierForTrust(tier, trust);
}

export function focusTierToMoment(tier: CardFocusTier): MomentLevel {
  if (tier === "ignite") return "ignite";
  if (tier === "hot") return "hot";
  if (tier === "warm") return "warm";
  return "calm";
}

export interface HeroOpportunity {
  match: EnrichedLiveMatch;
  headline: string;
  narrative: string;
  conductor: string;
  momentLevel: MomentLevel;
  score: number;
}

export interface OperationalAlert {
  id: string;
  timestamp: string;
  type: LiveSignalType;
  fixtureId: string;
  matchLabel: string;
  headline: string;
  narrative: string;
  momentLevel: MomentLevel;
  market?: string;
  edgePercent: number;
  minuteLabel?: string;
}

export interface HeatRankEntry {
  match: EnrichedLiveMatch;
  heat: number;
  tags: string[];
  narrative: string;
}

export interface OperationalTimelineItem extends QuantTimelineEvent {
  fixtureId: string;
  matchLabel: string;
  league: string;
}

function momentFromScore(score: number): MomentLevel {
  if (score >= 88) return "ignite";
  if (score >= 68) return "hot";
  if (score >= 42) return "warm";
  return "calm";
}

function scoreMatch(m: EnrichedLiveMatch): number {
  if (m.opsFocusScore != null && m.opsFocusScore > 0) {
    let s = m.opsFocusScore;
    if (m.operationalState === "EXECUTE") s += 12;
    if (m.evPlus) s += 10;
    if (m.opsRiskContext === "DANGEROUS") s *= 0.78;
    s *= m.trustVisualWeight ?? computeMatchTrust(m).visualWeight;
    return Math.round(s);
  }
  let s = 0;
  if (m.operationalState === "EXECUTE") s += 95;
  else if (m.operationalState === "MONITOR") s += 48;
  else if (m.operationalState === "WAIT") s += 12;
  s += Math.min(40, (m.edgePercent ?? 0) * 2.2);
  s += Math.min(35, (m.evPercent ?? 0) * 2);
  s += m.pressureScore * 0.45;
  s += m.tacticalIntensity * 0.35;
  s += (m.opsChaosLevel ?? m.chaosIndex) * 0.2;
  if (m.steamMove) s += 28;
  s += m.urgency * 0.25;
  if (m.evPlus) s += 18;
  if (m.opsTemperature === "IGNITE") s += 20;
  else if (m.opsTemperature === "HOT") s += 10;
  if (m.lowConfidence) s *= 0.72;
  s *= m.trustVisualWeight ?? computeMatchTrust(m).visualWeight;
  return Math.round(s);
}

export function pickHeroOpportunity(
  matches: EnrichedLiveMatch[]
): HeroOpportunity | null {
  const live = matches.filter((m) => m.isLive);
  if (live.length === 0) return null;

  let best: EnrichedLiveMatch | null = null;
  let bestScore = -1;

  for (const m of live) {
    const trust = computeMatchTrust(m);
    if (!trustHeroEligible(m, trust)) continue;
    const sc = scoreMatch(m) * trust.visualWeight;
    if (sc > bestScore) {
      bestScore = sc;
      best = m;
    }
  }

  if (!best || bestScore < 28) return null;

  const heroTrust = computeMatchTrust(best);

  const momentLevel = best.opsTemperature
    ? temperatureToMoment(best.opsTemperature as MatchTemperature)
    : momentFromScore(bestScore);
  const estado = ESTADO_JOGO[best.operationalState];
  const score =
    best.scoreKnown && best.homeScore != null && best.awayScore != null
      ? `${best.homeScore} – ${best.awayScore}`
      : "Ao vivo";

  let headline =
    best.opsHeadline ?? `${best.homeTeam} x ${best.awayTeam}`;
  if (!best.opsHeadline) {
    if (best.operationalState === "EXECUTE") {
      headline = `Convergência operacional · ${best.homeTeam} x ${best.awayTeam}`;
    } else if (best.steamMove) {
      headline = `Mercado em defasagem · ${best.homeTeam} x ${best.awayTeam}`;
    } else if (best.pressureScore >= 72) {
      headline = `Intensidade elevada · ${best.homeTeam} x ${best.awayTeam}`;
    }
  }

  const narrative = softenNarrative(
    best.opsNarrative ||
      best.displayInsight ||
      best.tacticalNarrative ||
      best.cardInsight ||
      rotuloIntensidade(best.pressureScore),
    heroTrust
  );

  const conductor = best.opsTacticalScenario
    ? `${estado} · ${best.opsTemperature ?? "—"} · ${score} · ${best.minuteLabel ?? "ao vivo"}`
    : best.operationalState === "EXECUTE"
      ? `${estado} — ${best.minuteLabel ?? "ao vivo"}. Leitura institucional priorizada neste ciclo.`
      : best.edgePercent != null && best.edgePercent >= 6
        ? `${estado} · ${rotuloVantagem(best.edgePercent)} · ${score}`
        : `${estado} · ${score} · ${best.minuteLabel ?? ""}`.trim();

  return {
    match: best,
    headline,
    narrative,
    conductor,
    momentLevel,
    score: bestScore,
  };
}

export function rankHotMatches(
  matches: EnrichedLiveMatch[],
  limit = 6
): HeatRankEntry[] {
  const live = matches.filter((m) => m.isLive);
  return live
    .map((m) => {
      let heat = m.pressureScore * 0.5 + m.chaosIndex * 0.25;
      heat += (m.edgePercent ?? 0) * 2;
      if (m.steamMove) heat += 22;
      if (m.operationalState === "EXECUTE") heat += 30;
      if (m.pressureTrend === "RISING") heat += 14;
      if (m.oddsDrift != null && m.oddsDrift < -0.04) heat += 12;

      const tags: string[] = [];
      if (m.operationalState === "EXECUTE") tags.push("Oportunidade");
      if (m.steamMove) tags.push("Mercado atrasado");
      if (m.pressureScore >= 70) tags.push("Pressão alta");
      if (m.pressureTrend === "RISING" && m.pressureScore >= 55) {
        tags.push("Intensidade subindo");
      }
      if (m.chaosIndex >= 62) tags.push("Ritmo imprevisível");
      if ((m.edgePercent ?? 0) >= 8) tags.push("Vantagem");

      const trust = computeMatchTrust(m);
      const narrative = softenNarrative(
        m.opsNarrative ||
          m.displayInsight ||
          m.cardInsightSecondary ||
          m.cardInsight ||
          rotuloIntensidade(m.pressureScore),
        trust
      );

      return {
        match: m,
        heat: Math.round(heat),
        tags: tags.slice(0, 3),
        narrative,
      };
    })
    .sort((a, b) => b.heat - a.heat)
    .slice(0, limit);
}

function narrativeForSignal(
  entry: LiveSignalEntry,
  match?: EnrichedLiveMatch
): { headline: string; narrative: string; momentLevel: MomentLevel } {
  const min = match?.minuteLabel;
  const insight = match?.displayInsight ?? match?.cardInsight;
  const tactical = match?.tacticalNarrative;
  const trust = match ? computeMatchTrust(match) : null;

  switch (entry.type) {
    case "EXECUTE_WINDOW":
      return {
        headline: "Janela forte aberta",
        narrative: trust
          ? softenNarrative(
              insight ||
                tactical ||
                `${entry.matchLabel} pede atenção imediata${min ? ` (${min})` : ""}.`,
              trust
            )
          : insight ||
            tactical ||
            `${entry.matchLabel} pede atenção imediata${min ? ` (${min})` : ""}.`,
        momentLevel: "ignite",
      };
    case "STEAM_MOVE":
      return {
        headline: "Mercado acelerando",
        narrative: `As odds de ${entry.market} caíram rápido em ${entry.matchLabel} — alguém pode estar reagindo ao que acontece em campo.`,
        momentLevel: "hot",
      };
    case "EDGE_ALERT":
      return {
        headline: "Vantagem encontrada",
        narrative:
          insight ||
          `Modelo vê margem em ${entry.market} (+${entry.edgePercent.toFixed(1)}%) em ${entry.matchLabel}.`,
        momentLevel: entry.edgePercent >= 12 ? "hot" : "warm",
      };
    case "EV_PLUS":
      return {
        headline: match?.opsHeadline ?? "Valor esperado com contexto favorável",
        narrative:
          match?.opsNarrative ||
          `EV positivo em ${entry.matchLabel} — ${entry.market}. Leitura quantitativa alinhada à pressão em campo.`,
        momentLevel: match?.opsTemperature
          ? temperatureToMoment(match.opsTemperature as MatchTemperature)
          : "hot",
      };
    case "PRESSURE_SPIKE":
      return {
        headline: match?.opsHeadline ?? "Pressão ofensiva em aceleração",
        narrative:
          match?.opsNarrative ||
          tactical ||
          `Pressão sustentada com aceleração crescente${min ? ` · ${min}` : ""}. Mercado pode reagir com defasagem.`,
        momentLevel: match?.opsTemperature
          ? temperatureToMoment(match.opsTemperature as MatchTemperature)
          : "warm",
      };
    case "CHAOS_BURST":
      return {
        headline: "Volatilidade ofensiva elevada",
        narrative:
          match?.opsNarrative ||
          `${entry.matchLabel} — ritmo imprevisível com transições rápidas. Validar risco operacional antes de execução.`,
        momentLevel: "hot",
      };
    default:
      return {
        headline: match?.opsHeadline ?? "Mudança de contexto operacional",
        narrative:
          match?.opsNarrative ||
          insight ||
          `${entry.matchLabel} — leitura institucional em atualização.`,
        momentLevel: match?.opsTemperature
          ? temperatureToMoment(match.opsTemperature as MatchTemperature)
          : "warm",
      };
  }
}

export function buildOperationalAlerts(
  signals: LiveSignalEntry[],
  matches: EnrichedLiveMatch[],
  max = 32
): OperationalAlert[] {
  const byFixture = new Map(matches.map((m) => [m.fixtureId, m]));
  return signals.slice(0, max).map((s) => {
    const m = byFixture.get(s.fixtureId);
    const { headline, narrative, momentLevel } = narrativeForSignal(s, m);
    return {
      id: s.id,
      timestamp: s.timestamp,
      type: s.type,
      fixtureId: s.fixtureId,
      matchLabel: s.matchLabel,
      headline,
      narrative,
      momentLevel,
      market: s.market,
      edgePercent: s.edgePercent,
      minuteLabel: m?.minuteLabel,
    };
  });
}

export function buildOperationalTimeline(
  matches: EnrichedLiveMatch[],
  maxItems = 14
): OperationalTimelineItem[] {
  const items: OperationalTimelineItem[] = [];

  for (const m of matches) {
    if (!m.isLive) continue;
    const label = `${m.homeTeam} x ${m.awayTeam}`;
    const events = buildQuantTimeline({
      minute: m.minute ?? 0,
      pressureScore: m.pressureScore,
      chaosIndex: m.chaosIndex,
      steamMove: m.steamMove,
      oddsDrift: m.oddsDrift,
      operationalState: m.operationalState,
      sequenceState: m.sequenceState,
      triggerWindow: m.triggerWindow,
      microeventScore: m.microeventScore,
      topEdgeMarket: m.strongestEdgeMarket,
      topEdgePercent: m.edgePercent,
    });

    for (const ev of events) {
      items.push({
        ...ev,
        fixtureId: m.fixtureId,
        matchLabel: label,
        league: m.league,
      });
    }
  }

  return items
    .sort(
      (a, b) =>
        (b.intensity ?? 0) - (a.intensity ?? 0) ||
        b.minute - a.minute
    )
    .slice(0, maxItems);
}

export function momentClass(level: MomentLevel): string {
  return `gp-moment gp-moment--${level}`;
}

export function stateLabel(state: OperationalState): string {
  return ESTADO_JOGO[state];
}
