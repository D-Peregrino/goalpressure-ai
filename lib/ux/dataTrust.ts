/**
 * Camada de confiança nos dados — UI only, sem novas engines.
 * Degrada leitura e intensidade visual quando faltam fontes reais.
 */

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { DataQualityLevel } from "@/lib/terminal/matchCardIntelligence";
import type { CardFocusTier } from "@/lib/ux/operationalIntelligence";
import { insightDoJogo } from "@/lib/ux/sportsLanguage";

export type TrustLevel = "strong" | "moderate" | "limited";

export interface MatchTrustProfile {
  level: TrustLevel;
  score: number;
  label: string;
  sources: string[];
  suppressStrongClaims: boolean;
  /** 0–1 — peso visual (glow, breathe, hot tier) */
  visualWeight: number;
}

const STRONG_PHRASES =
  /\b(alta chance|muito forte|explodindo|imprevisível agora|vale olhar com atenção|janela forte)\b/gi;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function shortTeam(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1]! : name;
}

export function matchContextSuffix(m: EnrichedLiveMatch): string {
  if (m.isPreMatch) {
    return m.kickoffLabel ? `início ${m.kickoffLabel}` : "pré-jogo";
  }
  const score =
    m.scoreKnown && m.homeScore != null && m.awayScore != null
      ? `${m.homeScore}–${m.awayScore}`
      : null;
  const min = m.minuteLabel?.replace(/\s+/g, " ").trim();
  if (score && min) return `${shortTeam(m.homeTeam)} ${score} · ${min}`;
  if (min) return min;
  return m.league;
}

/** Pontua confiança com base em fontes reais disponíveis no fixture. */
export function computeMatchTrust(m: EnrichedLiveMatch): MatchTrustProfile {
  let score = 18;
  const sources: string[] = [];

  const dq: DataQualityLevel = m.dataQuality;
  if (dq === "rich") score += 22;
  else if (dq === "partial") score += 10;

  if (m.premiumFeed) {
    score += 10;
    sources.push("Feed ao vivo");
  }
  if (m.scoreKnown) {
    score += 6;
    sources.push("Placar");
  }
  if ((m.shots ?? 0) > 0 || (m.dangerousAttacks ?? 0) > 0) {
    score += 8;
    sources.push("Stats em campo");
  }
  if (m.tacticalSourcesUsed.length > 0) {
    score += 6;
    if (!sources.includes("Leitura tática")) sources.push("Leitura tática");
  }
  if (m.timelineEventsCount > 0) {
    score += 7;
    sources.push("Timeline");
  }
  if (m.sequenceState) {
    score += 5;
    sources.push("Sequência");
  }
  if (m.matchPhase) {
    score += 4;
    sources.push("Fase do jogo");
  }
  if (m.markets.length > 0 && m.odds.primary >= 1.05) {
    score += 8;
    sources.push("Odds");
  }
  if (m.pressureScore > 0 && !m.tacticalLimitedReading) {
    score += 6;
    sources.push("Pressão");
  }
  if (m.confidence >= 55) score += 5;

  if (m.lowConfidence) score -= 22;
  if (m.tacticalLimitedReading) score -= 18;
  if (dq === "sparse") score -= 12;
  if (!m.scoreKnown && m.isLive) score -= 8;

  score = clamp(Math.round(score), 0, 100);

  let level: TrustLevel = "limited";
  if (score >= 68) level = "strong";
  else if (score >= 42) level = "moderate";

  const label =
    level === "strong"
      ? "Leitura forte"
      : level === "moderate"
        ? "Leitura moderada"
        : "Leitura limitada";

  const suppressStrongClaims = level === "limited" || m.lowConfidence;

  const visualWeight =
    level === "strong"
      ? 1
      : level === "moderate"
        ? 0.72
        : 0.38;

  return {
    level,
    score,
    label,
    sources: sources.slice(0, 3),
    suppressStrongClaims,
    visualWeight,
  };
}

export function softenNarrative(text: string, trust: MatchTrustProfile): string {
  if (!trust.suppressStrongClaims) return text;
  let out = text.replace(STRONG_PHRASES, (m) => {
    const lower = m.toLowerCase();
    if (lower.includes("alta chance")) return "possível movimento";
    if (lower.includes("muito forte")) return "intensidade em campo";
    if (lower.includes("explodindo")) return "subindo";
    if (lower.includes("imprevisível")) return "ritmo variável";
    if (lower.includes("atenção")) return "acompanhar";
    return "sinal inicial";
  });
  if (trust.level === "limited" && out.length > 90) {
    out = `${out.slice(0, 87).trim()}…`;
  }
  return out;
}

function baseInsight(m: EnrichedLiveMatch): string {
  if (m.dominanceNarrative && m.dataQuality !== "sparse") {
    return m.dominanceNarrative;
  }
  if (m.tacticalNarrative && !m.tacticalLimitedReading) {
    return m.tacticalNarrative;
  }
  if (m.cardInsight) return m.cardInsight;
  if (m.isPreMatch) {
    return m.kickoffLabel
      ? `Início ${m.kickoffLabel} — ${m.league}`
      : `Pré-jogo · ${m.league}`;
  }
  return insightDoJogo({
    operationalState: m.operationalState,
    pressureScore: m.pressureScore,
    edgePercent: m.edgePercent,
    steamMove: m.steamMove,
    steamDirection: m.steamDirection,
    chaosIndex: m.chaosIndex,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    minuteLabel: m.minuteLabel,
    scoreKnown: m.scoreKnown,
    homeScore: m.homeScore,
    awayScore: m.awayScore,
  });
}

export function resolveDisplayInsight(
  m: EnrichedLiveMatch,
  trust: MatchTrustProfile
): string {
  let text = softenNarrative(baseInsight(m), trust);

  if (trust.level === "limited") {
    if (
      !text.includes("aguard") &&
      !text.includes("limitad") &&
      !text.includes("insuficient")
    ) {
      text = `${text} — leitura ainda em formação.`;
    }
  }

  return text;
}

export function differentiateInsight(
  text: string,
  m: EnrichedLiveMatch,
  seen: Map<string, number>
): string {
  const norm = text.trim().toLowerCase().slice(0, 48);
  const count = seen.get(norm) ?? 0;
  seen.set(norm, count + 1);
  if (count === 0) return text;
  const suffix = matchContextSuffix(m);
  if (text.includes(suffix)) return text;
  return `${text} · ${suffix}`;
}

export function capFocusTierForTrust(
  tier: CardFocusTier,
  trust: MatchTrustProfile
): CardFocusTier {
  if (trust.level === "limited") {
    if (tier === "ignite" || tier === "hot") return "warm";
    return tier;
  }
  if (trust.level === "moderate" && tier === "ignite") return "hot";
  return tier;
}

export function trustHeroEligible(m: EnrichedLiveMatch, trust: MatchTrustProfile): boolean {
  if (!m.isLive) return false;
  if (trust.level === "limited" && m.pressureScore < 58) return false;
  if (m.lowConfidence && m.pressureScore < 50) return false;
  return true;
}

export function applyTrustLayer(matches: EnrichedLiveMatch[]): EnrichedLiveMatch[] {
  const seen = new Map<string, number>();
  return matches.map((m) => {
    const trust = computeMatchTrust(m);
    let displayInsight = resolveDisplayInsight(m, trust);
    displayInsight = differentiateInsight(displayInsight, m, seen);
    return {
      ...m,
      trustLevel: trust.level,
      trustScore: trust.score,
      trustLabel: trust.label,
      trustSources: trust.sources,
      trustVisualWeight: trust.visualWeight,
      displayInsight,
    };
  });
}
