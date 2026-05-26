"use client";

import type { QuantLeagueRow } from "@/lib/admin/quant/quant.types";
import { QuantHeatmapGrid, QuantPanelShell } from "./QuantPanelShell";

export default function LeagueReliabilityHeatmap({
  leagues,
}: {
  leagues: QuantLeagueRow[];
}) {
  const reliabilityCells = leagues.map((l) => ({
    key: l.league,
    label: l.league.length > 14 ? `${l.league.slice(0, 14)}…` : l.league,
    value: l.reliability,
    intensity: l.reliability,
  }));

  const chaosCells = leagues.map((l) => ({
    key: `chaos-${l.league}`,
    label: l.league.length > 12 ? `${l.league.slice(0, 12)}…` : l.league,
    value: l.chaos,
    intensity: l.chaos,
  }));

  return (
    <QuantPanelShell
      title="Ligas · confiabilidade e caos"
      subtitle="Ranking quantitativo por previsibilidade, EV contextual e atraso de mercado"
    >
      <div className="gp-quant-table-wrap">
        <table className="gp-quant-table">
          <thead>
            <tr>
              <th>Liga</th>
              <th>Confiabilidade</th>
              <th>Caos</th>
              <th>EV ctx.</th>
              <th>Mercado</th>
              <th>Previsib.</th>
              <th>N</th>
            </tr>
          </thead>
          <tbody>
            {leagues.length === 0 ? (
              <tr>
                <td colSpan={7} className="gp-quant-muted">
                  Aguardando amostras históricas
                </td>
              </tr>
            ) : (
              leagues.map((l) => (
                <tr key={l.league}>
                  <td>{l.league}</td>
                  <td>{l.reliability}</td>
                  <td>{l.chaos}</td>
                  <td>{l.contextualEv}%</td>
                  <td>{l.marketLag}</td>
                  <td>{l.predictability}%</td>
                  <td>{l.samples}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="gp-quant-cols">
        <div>
          <h3 className="gp-quant-section-label">Heatmap · confiabilidade</h3>
          <QuantHeatmapGrid cells={reliabilityCells} />
        </div>
        <div>
          <h3 className="gp-quant-section-label">Heatmap · caos</h3>
          <QuantHeatmapGrid cells={chaosCells} />
        </div>
      </div>
    </QuantPanelShell>
  );
}
