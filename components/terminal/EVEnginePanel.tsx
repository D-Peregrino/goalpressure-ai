"use client";

import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";

function distortionClass(level: string | undefined): string {
  switch (level) {
    case "EXTREME":
      return "gp-ev-panel__dist--extreme";
    case "HIGH":
      return "gp-ev-panel__dist--high";
    case "MEDIUM":
      return "gp-ev-panel__dist--medium";
    default:
      return "";
  }
}

export default function EVEnginePanel({ matches }: { matches: EnrichedLiveMatch[] }) {
  const ranked = [...matches]
    .filter((m) => m.evPercent != null && m.evPercent > 0)
    .sort((a, b) => (b.evPercent ?? 0) - (a.evPercent ?? 0))
    .slice(0, 8);

  const withEv = matches.filter((m) => (m.evPercent ?? 0) >= 2);

  return (
    <section className="gp-ev-engine-panel">
      <header className="gp-ev-engine-panel__head">
        <h2 className="gp-type-title">EV ENGINE</h2>
        <span className="gp-sport-badge gp-sport-badge--live">VALUE LIVE</span>
      </header>
      <div className="gp-ev-engine-panel__kpis">
        <div>
          <p className="gp-type-caption">Oportunidades EV+</p>
          <p className="gp-ev-engine-panel__value tabular-nums">{withEv.length}</p>
        </div>
        <div>
          <p className="gp-type-caption">Monitorados</p>
          <p className="gp-ev-engine-panel__value tabular-nums">{matches.length}</p>
        </div>
      </div>
      {ranked.length === 0 ? (
        <p className="gp-type-caption text-muted">
          Sem edge positivo detectado neste ciclo — aguardando distorção mercado vs odd justa.
        </p>
      ) : (
        <table className="gp-ev-engine-panel__table">
          <thead>
            <tr>
              <th>Jogo</th>
              <th>EV%</th>
              <th>Justa</th>
              <th>Mercado</th>
              <th>Conf.</th>
              <th>Dist.</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((m) => (
              <tr
                key={m.fixtureId}
                className={
                  (m.evPercent ?? 0) >= 5
                    ? "gp-ev-row--positive"
                    : (m.evPercent ?? 0) < 0
                      ? "gp-ev-row--trap"
                      : "gp-ev-row--watch"
                }
              >
                <td className="gp-ev-engine-panel__match">
                  {m.homeTeam} x {m.awayTeam}
                </td>
                <td className="tabular-nums font-semibold">
                  {(m.evPercent ?? 0).toFixed(1)}%
                </td>
                <td className="tabular-nums">{m.fairOdd?.toFixed(2) ?? "—"}</td>
                <td className="tabular-nums">{m.marketOdd?.toFixed(2) ?? "—"}</td>
                <td className="tabular-nums">{m.evConfidence ?? "—"}</td>
                <td className={distortionClass(m.evDistortionLevel ?? undefined)}>
                  {m.evDistortionLevel ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
