"use client";

import type { OpsRadarCell } from "@/lib/ops/opsCenter.types";

export default function ContextRadar({
  cells,
  hotLeagues,
}: {
  cells: OpsRadarCell[];
  hotLeagues: { league: string; heat: number }[];
}) {
  const maxCrit = Math.max(1, ...cells.map((c) => c.criticality));

  return (
    <section className="gp-ops-panel">
      <header className="gp-ops-panel__head">
        <h3>Radar contextual</h3>
        <p>Jogos críticos · ligas quentes · pressão coletiva</p>
      </header>
      {hotLeagues.length > 0 && (
        <div className="gp-ops-radar__leagues">
          {hotLeagues.map((l) => (
            <span key={l.league} className="gp-ops-chip">
              {l.league} · {l.heat}
            </span>
          ))}
        </div>
      )}
      <ul className="gp-ops-radar__list">
        {cells.map((c) => {
          const pct = Math.round((c.criticality / maxCrit) * 100);
          return (
            <li key={c.fixtureId} className="gp-ops-radar__row">
              <div className="gp-ops-radar__bar" style={{ width: `${pct}%` }} />
              <div className="gp-ops-radar__content">
                <strong>{c.matchLabel}</strong>
                <span>
                  {c.league} · P {c.pressureScore}
                  {c.gpiScore != null ? ` · GPI ${c.gpiScore}` : ""}
                  {c.observerCount > 0 ? ` · ${c.observerCount} obs.` : ""}
                </span>
              </div>
              <span className="gp-ops-radar__crit">{c.criticality}</span>
            </li>
          );
        })}
      </ul>
      {!cells.length && <p className="gp-ops-empty">Radar sem alvos críticos.</p>}
    </section>
  );
}
