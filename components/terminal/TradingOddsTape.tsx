"use client";

import { memo } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { SteamDirection } from "@/lib/signals/executionWindow";
import { TOOLTIPS } from "@/lib/ux/sportsLanguage";

function TradingOddsTapeInner({
  fairOdd,
  marketOdd,
  edgePercent,
  evPlus,
  steamDirection,
  showFair,
}: {
  fairOdd: number | null;
  marketOdd: number | null;
  edgePercent: number | null;
  evPlus: boolean;
  steamDirection: SteamDirection;
  showFair: boolean;
}) {
  const edge = edgePercent ?? 0;

  return (
    <div className="gp-trading-tape">
      {showFair && (
        <div className="gp-trading-tape__cell">
          <span className="gp-trading-tape__label" title={TOOLTIPS.oddJusta}>
            Justa
          </span>
          <span className="gp-trading-tape__value tabular-nums">
            {fairOdd != null && fairOdd >= 1.01 ? fairOdd.toFixed(2) : "—"}
          </span>
        </div>
      )}
      <div className="gp-trading-tape__cell gp-trading-tape__cell--market">
        <span className="gp-trading-tape__label">Casa</span>
        <span className="gp-trading-tape__value tabular-nums">
          {marketOdd != null && marketOdd >= 1.01 ? marketOdd.toFixed(2) : "—"}
        </span>
      </div>
      <div className={`gp-trading-tape__cell ${edge >= 3 ? "gp-trading-tape__cell--edge-hot" : ""}`}>
        <span className="gp-trading-tape__label" title={TOOLTIPS.vantagem}>
          Vantagem
        </span>
        <span className="gp-trading-tape__value tabular-nums">
          {edgePercent != null ? `${edge >= 0 ? "+" : ""}${edge.toFixed(1)}%` : "—"}
        </span>
      </div>
      {evPlus && (
        <span className="gp-trading-tape__ev" title="Chance com valor esperado positivo">
          Destaque
        </span>
      )}
      <div className="gp-trading-tape__steam">
        {steamDirection === "DOWN" && (
          <>
            <TrendingDown className="h-3.5 w-3.5" />
            <span title={TOOLTIPS.mercadoAcelerando}>Acelerando ↓</span>
          </>
        )}
        {steamDirection === "UP" && (
          <>
            <TrendingUp className="h-3.5 w-3.5" />
            <span title={TOOLTIPS.mercadoEsfriando}>Esfriando ↑</span>
          </>
        )}
        {steamDirection === "FLAT" && <span className="opacity-50">—</span>}
      </div>
    </div>
  );
}

export default memo(TradingOddsTapeInner);
