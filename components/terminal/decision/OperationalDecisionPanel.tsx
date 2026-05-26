"use client";

import { useMemo } from "react";
import {
  AlertTriangle,
  Ban,
  Eye,
  Shield,
  Sparkles,
} from "lucide-react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";
import { mapOperationalDecision } from "./decisionMapper";
import { evaluateGpiFromEnriched } from "@/lib/gpi/gpiEvaluate";

const SEAL_ICON = {
  NEUTRO: Shield,
  ACOMPANHAR: Eye,
  ALERTA: AlertTriangle,
  OPORTUNIDADE: Sparkles,
  EVITAR: Ban,
} as const;

export default function OperationalDecisionPanel({
  match,
  context,
}: {
  match: EnrichedLiveMatch;
  context: MatchContextResult;
}) {
  const decision = useMemo(() => mapOperationalDecision(match, context), [match, context]);
  const gpi = useMemo(() => evaluateGpiFromEnriched(match), [match]);
  const Icon = SEAL_ICON[decision.selo];

  return (
    <section
      className={`gp-decision gp-decision--${decision.sealTone}`}
      title="Esta leitura é gerada a partir de pressão ofensiva, valor esperado, ritmo e risco contextual."
      aria-label="Painel de decisão operacional"
    >
      <header className="gp-decision__head">
        <div className="gp-decision__seal-wrap">
          <Icon className="gp-decision__seal-icon h-4 w-4" aria-hidden />
          <span className="gp-decision__seal">{decision.selo}</span>
          <span className="gp-decision__gpi-chip" title="GoalPressure Index operacional">
            GPI {gpi.score}
          </span>
        </div>
        <p className="gp-decision__tooltip-hint">
          Leitura gerada a partir de pressão ofensiva, valor esperado, ritmo e risco contextual.
        </p>
      </header>

      <div className="gp-decision__grid">
        <div className="gp-decision__cell">
          <span>Situação atual</span>
          <strong>{decision.situacaoAtual}</strong>
        </div>
        <div className="gp-decision__cell">
          <span>Ação sugerida</span>
          <strong>{decision.acaoSugerida}</strong>
        </div>
        <div className="gp-decision__cell">
          <span>Risco</span>
          <strong
            className={`gp-decision__risk gp-decision__risk--${decision.risco.replace(/\s+/g, "-").toLowerCase()}`}
          >
            {decision.risco}
          </strong>
        </div>
      </div>

      <p className="gp-decision__just">{decision.justificativa}</p>

      <div className="gp-decision__confidence">
        <div className="gp-decision__confidence-label">
          <span>Confiança da leitura</span>
          <strong>{decision.confianca}%</strong>
        </div>
        <div
          className="gp-decision__confidence-bar"
          role="progressbar"
          aria-valuenow={decision.confianca}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <span style={{ width: `${decision.confianca}%` }} />
        </div>
      </div>
    </section>
  );
}
