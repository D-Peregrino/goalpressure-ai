"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import OperationalStateBadge from "@/components/terminal/OperationalStateBadge";
import SportsTooltip from "@/components/ui/SportsTooltip";
import type { BestExecutionPick } from "@/lib/match/pickBestExecution";
import { narrateExecution } from "@/lib/match/matchStorytelling";
import { TOOLTIPS } from "@/lib/ux/sportsLanguage";

function ExecutionCenterPanelInner({
  best,
}: {
  best: BestExecutionPick | null;
}) {
  const narrative = useMemo(
    () =>
      best
        ? narrateExecution({
            edgePercent: best.edgePercent,
            steamMove: best.steamMove,
            oddsDrift: best.oddsDrift,
            operationalState: best.operationalState,
            confidence: best.confidence,
            urgency: best.urgency,
          })
        : null,
    [best]
  );

  return (
    <aside className="gp-mc-exec gp-mc-exec--story">
      <header className="gp-mc-exec__head">
        <h2 className="gp-mc-exec__title">Oportunidade agora</h2>
        <p className="gp-mc-exec__sub">Leitura simples do mercado e do jogo</p>
      </header>

      {!best || !narrative ? (
        <div className="gp-mc-exec__empty-wrap">
          <p className="gp-mc-exec__empty">
            Ainda sem vantagem clara. O mercado pode reagir nos próximos minutos.
          </p>
          <p className="gp-mc-exec__tip">
            Dica: espere o badge &quot;Oportunidade&quot; ou &quot;Mercado acelerando&quot; no
            topo do jogo.
          </p>
        </div>
      ) : (
        <motion.div
          className="gp-mc-exec__body"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <OperationalStateBadge state={best.operationalState} />
          <h3 className="gp-mc-exec__narrative-title">{narrative.title}</h3>
          <p className="gp-mc-exec__explain">{narrative.explanation}</p>
          <p className="gp-mc-exec__window">{narrative.windowHint}</p>

          <p className="gp-mc-exec__market">{best.market}</p>
          <span className="gp-mc-exec__market-state">{narrative.marketLabel}</span>

          <div className="gp-mc-exec__odds tabular-nums">
            {best.previousOdd != null && best.previousOdd >= 1.01 && (
              <span className="gp-mc-exec__prev">{best.previousOdd.toFixed(2)}</span>
            )}
            {best.previousOdd != null && <span className="gp-mc-exec__arrow">→</span>}
            <span className="gp-mc-exec__curr">{best.marketOdd.toFixed(2)}</span>
          </div>

          <div className="gp-mc-exec__highlights">
            <div className="gp-mc-exec__highlight">
              <SportsTooltip label="Vantagem" tip={TOOLTIPS.vantagem}>
                <span className="gp-mc-exec__highlight-label">Vantagem encontrada</span>
              </SportsTooltip>
              <strong className="gp-mc-exec__edge tabular-nums">
                +{best.edgePercent.toFixed(1)}%
              </strong>
            </div>
            <div className="gp-mc-exec__highlight">
              <span className="gp-mc-exec__highlight-label">{narrative.confidenceLabel}</span>
              <strong className="tabular-nums">{Math.round(best.confidence)}</strong>
            </div>
          </div>

          <details className="gp-mc-exec__details">
            <summary>Ver números</summary>
            <dl className="gp-mc-exec__dl">
              <div>
                <dt>Odd justa</dt>
                <dd className="tabular-nums">
                  {best.fairOdd != null ? best.fairOdd.toFixed(2) : "—"}
                </dd>
              </div>
              <div>
                <dt>Valor esperado</dt>
                <dd className="tabular-nums">{(best.expectedValue * 100).toFixed(1)}%</dd>
              </div>
              <div>
                <dt>Urgência</dt>
                <dd className="tabular-nums">{best.urgency}</dd>
              </div>
            </dl>
          </details>
        </motion.div>
      )}
    </aside>
  );
}

export default memo(ExecutionCenterPanelInner);
