"use client";

import type { MarketDistortionItem } from "@/lib/ops/opsCenter.types";

export default function MarketDistortionMonitor({
  items,
}: {
  items: MarketDistortionItem[];
}) {
  return (
    <section className="gp-ops-panel">
      <header className="gp-ops-panel__head">
        <h3>Market distortion</h3>
        <p>Odds atrasadas · EV contextual · jogos ignorados</p>
      </header>
      <ul className="gp-ops-distortions">
        {items.map((d) => (
          <li key={`${d.fixtureId}-${d.market}`} className="gp-ops-distortion">
            <div>
              <strong>{d.matchLabel}</strong>
              <span>
                {d.market} · {d.classification}
              </span>
            </div>
            <div className="gp-ops-distortion__nums">
              <span>Edge {d.edgePercent.toFixed(1)}%</span>
              <span>EV {(d.ev * 100).toFixed(1)}%</span>
            </div>
            <div className="gp-ops-distortion__flags">
              {d.laggedOdds && <span className="lag">Odds atrasadas</span>}
              {d.ignored && <span className="ignore">Ignorado</span>}
            </div>
          </li>
        ))}
      </ul>
      {!items.length && <p className="gp-ops-empty">Sem distorções de mercado detectadas.</p>}
    </section>
  );
}
