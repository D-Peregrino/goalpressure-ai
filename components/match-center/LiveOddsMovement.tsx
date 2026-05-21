"use client";

import { memo } from "react";
import { motion } from "framer-motion";

interface OddsRow {
  market: string;
  odd: number;
  previousOdd?: number | null;
  edge?: number;
  steam?: boolean;
  drift?: number | null;
}

function LiveOddsMovementInner({ rows }: { rows: OddsRow[] }) {
  return (
    <section className="gp-mc-panel gp-mc-odds">
      <header className="gp-mc-panel__head">
        <h2 className="gp-mc-panel__title">Odds ao vivo</h2>
      </header>

      {rows.length === 0 ? (
        <p className="gp-mc-odds__empty">Odds ao vivo ainda não disponíveis para este jogo.</p>
      ) : (
        <div className="gp-mc-odds__tape">
          {rows.map((r) => {
            const pulse = r.steam || (r.drift != null && r.drift <= -0.05);
            return (
              <motion.div
                key={r.market}
                layout
                className={`gp-mc-odds__row ${pulse ? "gp-mc-odds__row--pulse" : ""}`}
              >
                <span className="gp-mc-odds__market">{r.market}</span>
                <span className="gp-mc-odds__line tabular-nums">
                  {r.previousOdd != null && r.previousOdd >= 1.01
                    ? `${r.previousOdd.toFixed(2)} → `
                    : ""}
                  {r.odd.toFixed(2)}
                </span>
                {r.edge != null && (
                  <span className="gp-mc-odds__edge tabular-nums">
                    +{r.edge.toFixed(1)}%
                  </span>
                )}
                {r.steam && <span className="gp-mc-odds__steam">Acelerando</span>}
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="gp-mc-odds__chart" aria-hidden>
        {rows.slice(0, 12).map((r, i) => (
          <div
            key={`bar-${r.market}`}
            className="gp-mc-odds__bar"
            style={{
              height: `${Math.min(100, (r.odd - 1) * 40 + (r.edge ?? 0) * 2)}%`,
              animationDelay: `${i * 0.05}s`,
            }}
          />
        ))}
      </div>
    </section>
  );
}

export default memo(LiveOddsMovementInner);
