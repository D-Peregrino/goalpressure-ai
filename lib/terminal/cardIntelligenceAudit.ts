/**
 * Metadados de auditoria — explica por que cada card recebeu sua leitura.
 * Somente camada UX/debug; não altera engines.
 */

import type { Match } from "@/types/domain";
import type { DataQualityLevel, MatchCardIntelligenceInput } from "@/lib/terminal/matchCardIntelligence";
import type { OperationalState } from "@/lib/signals/executionWindow";

export interface CardIntelligenceAudit {
  sourcesUsed: string[];
  missingFields: string[];
  fallbacksUsed: string[];
  insightReason: string;
  confidenceReason: string;
  operationalStateReason: string;
  pressureReason: string;
  rawOperationalState: OperationalState;
  finalOperationalState: OperationalState;
}

export type CardAuditDraft = Omit<
  BuildAuditParams,
  "rawOperationalState" | "finalOperationalState" | "stateAdjustedForConfidence"
>;

export interface BuildAuditParams {
  match: Match;
  input: MatchCardIntelligenceInput;
  dataQuality: DataQualityLevel;
  hasOps: boolean;
  hasTeamStats: boolean;
  hasMeta: boolean;
  hasTemporal: boolean;
  hasMicroevent: boolean;
  hasSequence: boolean;
  hasMarketEdge: boolean;
  primaryInsightReason: string;
  primaryInsight: string;
  confidence: number;
  lowConfidence: boolean;
  pressureScore: number;
  homePressure: number;
  awayPressure: number;
  fieldPressure: number;
  opsWeight: number | null;
  rawOperationalState: OperationalState;
  finalOperationalState: OperationalState;
  stateAdjustedForConfidence: boolean;
  fieldConfidence: number;
}

export function collectSourcesUsed(
  match: Match,
  input: MatchCardIntelligenceInput,
  flags: {
    hasOps: boolean;
    hasTeamStats: boolean;
    hasMeta: boolean;
    hasTemporal: boolean;
    hasMicroevent: boolean;
    hasSequence: boolean;
    hasMarketEdge: boolean;
  }
): string[] {
  const sources: string[] = [];
  if (match.odds.primary >= 1.05 || (match.oddsQuotes?.length ?? 0) > 0) {
    sources.push("odds");
  }
  if (input.scoreKnown) sources.push("placar");
  if ((input.minute ?? 0) > 0 || input.isLive) sources.push("minuto");
  const s = match.stats;
  if (s.shots > 0 || s.dangerousAttacks > 0 || s.shotsOnTarget > 0) {
    sources.push("stats");
  }
  if (flags.hasTeamStats) sources.push("teamStats");
  if (flags.hasOps) sources.push("ops");
  if (flags.hasMeta) sources.push("meta");
  if (flags.hasTemporal) sources.push("temporal");
  if (flags.hasMicroevent) sources.push("microevent");
  if (flags.hasSequence) sources.push("sequence");
  if (flags.hasMarketEdge) sources.push("marketCalibration");
  if ((match.premium?.timelineEventsCount ?? 0) > 0) sources.push("eventos");
  if (input.premiumFeed) sources.push("premiumFeed");
  return sources;
}

export function collectMissingFields(
  match: Match,
  input: MatchCardIntelligenceInput,
  flags: {
    hasOps: boolean;
    hasTeamStats: boolean;
    hasMeta: boolean;
    hasTemporal: boolean;
    hasMicroevent: boolean;
    hasSequence: boolean;
    hasMarketEdge: boolean;
  }
): string[] {
  const missing: string[] = [];
  if (!flags.hasTeamStats) missing.push("teamStats");
  if (!flags.hasOps) missing.push("opsPressure");
  if (!flags.hasMeta) missing.push("meta");
  if (!flags.hasTemporal) missing.push("temporal");
  if (!flags.hasMicroevent) missing.push("microevent");
  if (!flags.hasSequence) missing.push("sequence");
  if (!flags.hasMarketEdge) missing.push("marketCalibration");
  if ((match.premium?.timelineEventsCount ?? 0) === 0) missing.push("eventos");
  if (match.stats.shots === 0 && match.stats.dangerousAttacks === 0) {
    missing.push("statsOfensivos");
  }
  if ((match.stats.possession ?? 0) <= 0 || match.stats.possession === 50) {
    missing.push("posseReal");
  }
  if (!input.scoreKnown && input.isLive) missing.push("placar");
  return missing;
}

export function collectFallbacksUsed(params: {
  hasOps: boolean;
  hasTeamStats: boolean;
  opsWeight: number | null;
  isPreMatch: boolean;
  usedFieldPressure: boolean;
  usedOpsChaosBlend: boolean;
  chaosFromOpsLow: boolean;
  confidenceUsedFieldOnly: boolean;
  edgeHiddenLowQuality: boolean;
}): string[] {
  const f: string[] = [];
  if (!params.hasTeamStats) {
    f.push("pressão casa/fora estimada por stats agregados ou posse");
  }
  if (!params.hasOps && params.usedFieldPressure) {
    f.push("pressão derivada do motor quant de campo (sem ops live)");
  }
  if (params.hasOps && params.opsWeight != null) {
    f.push(`blend pressão ops ${Math.round(params.opsWeight * 100)}% + campo`);
  }
  if (params.isPreMatch) {
    f.push("pré-jogo: pressão calibrada pelas odds (over 0.5)");
  }
  if (params.chaosFromOpsLow) {
    f.push("volatilidade calculada em campo (ops chaos ausente)");
  }
  if (params.confidenceUsedFieldOnly) {
    f.push("confiança sem meta/ops — só completude de stats");
  }
  if (params.edgeHiddenLowQuality) {
    f.push("vantagem oculta no card por dataQuality sparse");
  }
  return f;
}

export function buildPressureReason(params: {
  fieldPressure: number;
  finalPressure: number;
  homePressure: number;
  awayPressure: number;
  hasOps: boolean;
  opsWeight: number | null;
  isPreMatch: boolean;
}): string {
  const parts: string[] = [
    `campo ${params.fieldPressure}`,
    `final ${params.finalPressure}`,
    `casa ${params.homePressure} / fora ${params.awayPressure}`,
  ];
  if (params.hasOps && params.opsWeight != null) {
    parts.push(`blend ops ${Math.round(params.opsWeight * 100)}%`);
  }
  if (params.isPreMatch) parts.push("ajuste pré-jogo via odds");
  return parts.join(" · ");
}

export function buildConfidenceReason(
  confidence: number,
  dataQuality: DataQualityLevel,
  lowConfidence: boolean,
  input: MatchCardIntelligenceInput,
  fieldConfidence: number
): string {
  const parts: string[] = [`${confidence} (quality ${dataQuality})`];
  if (input.metaConfidence != null) {
    parts.push(`meta ${Math.round(input.metaConfidence)}`);
  }
  if (input.opsPressure?.confidence) {
    parts.push(`ops ${Math.round(input.opsPressure.confidence)}`);
  }
  parts.push(`campo ${fieldConfidence}`);
  parts.push(`validação ${Math.round(input.validationScore)}`);
  if (input.fpRisk > 0) parts.push(`penalidade FP ${Math.round(input.fpRisk)}`);
  if (input.staleRisk > 0) parts.push(`stale ${Math.round(input.staleRisk)}`);
  if (lowConfidence) parts.push("marcada baixa confiança");
  return parts.join(" · ");
}

export function buildOperationalStateReason(
  raw: OperationalState,
  final: OperationalState,
  adjusted: boolean,
  lowConfidence: boolean,
  dataQuality: DataQualityLevel
): string {
  const rawPt: Record<OperationalState, string> = {
    EXECUTE: "Oportunidade",
    MONITOR: "Acompanhar",
    WAIT: "Aguardar",
    AVOID: "Evitar",
  };
  let reason = `motor → ${rawPt[raw]}`;
  if (adjusted) {
    reason += ` · rebaixado para ${rawPt[final]}`;
    if (lowConfidence) reason += " por baixa confiança nos dados";
    if (dataQuality === "sparse") reason += " (dados sparse)";
  }
  return reason;
}

export function buildCardIntelligenceAudit(params: BuildAuditParams): CardIntelligenceAudit {
  const flags = {
    hasOps: params.hasOps,
    hasTeamStats: params.hasTeamStats,
    hasMeta: params.hasMeta,
    hasTemporal: params.hasTemporal,
    hasMicroevent: params.hasMicroevent,
    hasSequence: params.hasSequence,
    hasMarketEdge: params.hasMarketEdge,
  };

  const chaosFromOpsLow = params.input.chaosFromOps < 12;

  return {
    sourcesUsed: collectSourcesUsed(params.match, params.input, flags),
    missingFields: collectMissingFields(params.match, params.input, flags),
    fallbacksUsed: collectFallbacksUsed({
      hasOps: params.hasOps,
      hasTeamStats: params.hasTeamStats,
      opsWeight: params.opsWeight,
      isPreMatch: params.input.isPreMatch,
      usedFieldPressure: true,
      usedOpsChaosBlend: !chaosFromOpsLow,
      chaosFromOpsLow,
      confidenceUsedFieldOnly: !params.hasMeta && !params.hasOps,
      edgeHiddenLowQuality:
        params.input.topEdge?.edgePercent != null && params.lowConfidence,
    }),
    insightReason: `"${params.primaryInsight}" — ${params.primaryInsightReason}`,
    confidenceReason: buildConfidenceReason(
      params.confidence,
      params.dataQuality,
      params.lowConfidence,
      params.input,
      params.fieldConfidence
    ),
    operationalStateReason: buildOperationalStateReason(
      params.rawOperationalState,
      params.finalOperationalState,
      params.stateAdjustedForConfidence,
      params.lowConfidence,
      params.dataQuality
    ),
    pressureReason: buildPressureReason({
      fieldPressure: params.fieldPressure,
      finalPressure: params.pressureScore,
      homePressure: params.homePressure,
      awayPressure: params.awayPressure,
      hasOps: params.hasOps,
      opsWeight: params.opsWeight,
      isPreMatch: params.input.isPreMatch,
    }),
    rawOperationalState: params.rawOperationalState,
    finalOperationalState: params.finalOperationalState,
  };
}

/** Payload público do endpoint de debug. */
export interface CardIntelligenceDebugEntry {
  fixtureId: string;
  matchLabel: string;
  dataQuality: DataQualityLevel;
  sourcesUsed: string[];
  missingFields: string[];
  fallbacksUsed: string[];
  cardInsight: string;
  confidenceReason: string;
  operationalStateReason: string;
  insightReason: string;
  pressureReason: string;
  confidence: number;
  pressureScore: number;
  operationalState: OperationalState;
}

export function auditToDebugEntry(
  fixtureId: string,
  matchLabel: string,
  intel: {
    primaryInsight: string;
    confidence: number;
    pressureScore: number;
    dataQuality: DataQualityLevel;
    audit: CardIntelligenceAudit;
  },
  finalState: OperationalState
): CardIntelligenceDebugEntry {
  return {
    fixtureId,
    matchLabel,
    dataQuality: intel.dataQuality,
    sourcesUsed: intel.audit.sourcesUsed,
    missingFields: intel.audit.missingFields,
    fallbacksUsed: intel.audit.fallbacksUsed,
    cardInsight: intel.primaryInsight,
    confidenceReason: intel.audit.confidenceReason,
    operationalStateReason: intel.audit.operationalStateReason,
    insightReason: intel.audit.insightReason,
    pressureReason: intel.audit.pressureReason,
    confidence: intel.confidence,
    pressureScore: intel.pressureScore,
    operationalState: finalState,
  };
}
