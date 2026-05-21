"use client";

import { memo } from "react";
import type { CardIntelligenceAudit } from "@/lib/terminal/cardIntelligenceAudit";
import type { DataQualityLevel } from "@/lib/terminal/matchCardIntelligence";
import type { OperationalState } from "@/lib/signals/executionWindow";
import type { TacticalProfile } from "@/lib/tactical/tacticalMatchReader";

const QUALITY_LABEL: Record<DataQualityLevel, string> = {
  rich: "rich",
  partial: "partial",
  sparse: "sparse",
};

const STATE_PT: Record<OperationalState, string> = {
  EXECUTE: "Oportunidade",
  MONITOR: "Acompanhar",
  WAIT: "Aguardar",
  AVOID: "Evitar",
};

function formatSources(sources: string[]): string {
  if (sources.length === 0) return "nenhuma";
  return sources.join(" + ");
}

function MatchCardAuditStripInner({
  dataQuality,
  audit,
  operationalState,
  tacticalProfile,
  tacticalReasoning,
  tacticalConfidence,
}: {
  dataQuality: DataQualityLevel;
  audit: CardIntelligenceAudit;
  operationalState: OperationalState;
  tacticalProfile?: TacticalProfile;
  tacticalReasoning?: string;
  tacticalConfidence?: number;
}) {
  const fallbacks =
    audit.fallbacksUsed.length > 0
      ? audit.fallbacksUsed.join("; ")
      : "nenhum";
  const missing =
    audit.missingFields.length > 0
      ? `sem ${audit.missingFields.join(", sem ")}`
      : "completo";

  return (
    <aside className="gp-card-audit" aria-label="Auditoria do card">
      <p className="gp-card-audit__line">
        <span className="gp-card-audit__k">Qualidade</span>
        <span className="gp-card-audit__v">{QUALITY_LABEL[dataQuality]}</span>
      </p>
      <p className="gp-card-audit__line">
        <span className="gp-card-audit__k">Fontes</span>
        <span className="gp-card-audit__v">{formatSources(audit.sourcesUsed)}</span>
      </p>
      <p className="gp-card-audit__line">
        <span className="gp-card-audit__k">Fallbacks</span>
        <span className="gp-card-audit__v">{fallbacks}</span>
      </p>
      <p className="gp-card-audit__line">
        <span className="gp-card-audit__k">Ausentes</span>
        <span className="gp-card-audit__v">{missing}</span>
      </p>
      <p className="gp-card-audit__line">
        <span className="gp-card-audit__k">Insight</span>
        <span className="gp-card-audit__v">{audit.insightReason}</span>
      </p>
      <p className="gp-card-audit__line">
        <span className="gp-card-audit__k">Confiança</span>
        <span className="gp-card-audit__v">{audit.confidenceReason}</span>
      </p>
      <p className="gp-card-audit__line">
        <span className="gp-card-audit__k">Pressão</span>
        <span className="gp-card-audit__v">{audit.pressureReason}</span>
      </p>
      <p className="gp-card-audit__line">
        <span className="gp-card-audit__k">Estado</span>
        <span className="gp-card-audit__v">
          {STATE_PT[operationalState]} — {audit.operationalStateReason}
        </span>
      </p>
      {tacticalProfile && (
        <p className="gp-card-audit__line">
          <span className="gp-card-audit__k">Tática</span>
          <span className="gp-card-audit__v">
            {tacticalProfile}
            {tacticalConfidence != null ? ` · conf ${tacticalConfidence}` : ""}
            {tacticalReasoning ? ` — ${tacticalReasoning}` : ""}
          </span>
        </p>
      )}
    </aside>
  );
}

const MatchCardAuditStrip = memo(MatchCardAuditStripInner);
export default MatchCardAuditStrip;
