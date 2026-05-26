"use client";

import type { CSSProperties } from "react";
import type { CollectiveHeatCell } from "@/lib/network/network.types";

export default function CollectivePressureMap({
  cells,
}: {
  cells: CollectiveHeatCell[];
}) {
  const maxScore = Math.max(1, ...cells.map((c) => c.consensusScore));

  return (
    <section className="gp-net-panel">
      <header className="gp-net-panel__head">
        <h3>Mapa de pressão coletiva</h3>
        <p>Jogos mais observados · ligas quentes</p>
      </header>
      <div className="gp-net-heatmap">
        {cells.map((c) => {
          const intensity = Math.round((c.consensusScore / maxScore) * 100);
          return (
            <div
              key={c.fixtureId}
              className="gp-net-heat-cell"
              style={
                {
                  "--heat": `${intensity}%`,
                } as CSSProperties
              }
            >
              <span className="gp-net-heat-cell__league">{c.league ?? "—"}</span>
              <strong>{c.matchLabel}</strong>
              <div className="gp-net-heat-cell__stats">
                <span>Consenso {c.consensusScore}</span>
                <span>{c.observerCount} obs.</span>
                <span>P {c.collectivePressure}</span>
              </div>
            </div>
          );
        })}
      </div>
      {!cells.length && <p className="gp-net-empty">Heatmap aguardando atividade.</p>}
    </section>
  );
}
