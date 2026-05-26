"use client";

import { useEffect, useState } from "react";
import type { LearningDashboardSnapshot } from "@/lib/engine/learning/learning.types";

export default function LearningEnginePanel() {
  const [snapshot, setSnapshot] = useState<LearningDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/learning/dashboard", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.snapshot) setSnapshot(body.snapshot);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = window.setInterval(load, 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const acc = snapshot?.accuracy;

  return (
    <section className="gp-learning-panel">
      <header className="gp-learning-panel__head">
        <h2 className="gp-type-title">Aprendizado</h2>
        <span className="gp-sport-badge">MEMÓRIA</span>
      </header>

      {loading && !snapshot ? (
        <p className="gp-type-caption text-muted">Carregando memória operacional…</p>
      ) : (
        <>
          <div className="gp-learning-panel__kpis">
            <div>
              <p className="gp-type-caption">ROI histórico</p>
              <p className="gp-learning-panel__value tabular-nums">
                {acc?.roiTotal != null ? acc.roiTotal.toFixed(2) : "—"}
              </p>
            </div>
            <div>
              <p className="gp-type-caption">Accuracy</p>
              <p className="gp-learning-panel__value tabular-nums">
                {acc?.hitRate != null ? `${acc.hitRate}%` : "—"}
              </p>
            </div>
            <div>
              <p className="gp-type-caption">Resolvidos</p>
              <p className="gp-learning-panel__value tabular-nums">
                {acc?.totalResolved ?? 0}
              </p>
            </div>
            <div>
              <p className="gp-type-caption">Falsos positivos</p>
              <p className="gp-learning-panel__value tabular-nums">
                {snapshot?.falsePositiveRate ?? 0}%
              </p>
            </div>
          </div>

          {snapshot?.patterns && snapshot.patterns.length > 0 ? (
            <div className="gp-learning-panel__block">
              <p className="gp-type-caption">Padrões detectados</p>
              <ul className="gp-learning-panel__list">
                {snapshot.patterns.slice(0, 4).map((p) => (
                  <li key={p.type + (p.league ?? "")}>
                    <strong>{p.label}</strong>
                    <span>{p.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {snapshot?.leagues && snapshot.leagues.length > 0 ? (
            <div className="gp-learning-panel__block">
              <p className="gp-type-caption">Ligas mais fortes</p>
              <ul className="gp-learning-panel__tags">
                {snapshot.leagues.slice(0, 4).map((l) => (
                  <li key={l.league}>
                    {l.league} · {l.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {snapshot?.teams && snapshot.teams.length > 0 ? (
            <div className="gp-learning-panel__block">
              <p className="gp-type-caption">Times (perfil)</p>
              <ul className="gp-learning-panel__tags">
                {snapshot.teams.slice(0, 4).map((t) => (
                  <li key={`${t.team}-${t.league}`}>
                    {t.team} · {t.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {snapshot?.topMarkets && snapshot.topMarkets.length > 0 ? (
            <div className="gp-learning-panel__block">
              <p className="gp-type-caption">Mercados mais lucrativos</p>
              <ul className="gp-learning-panel__tags">
                {snapshot.topMarkets.map((m) => (
                  <li key={m.market}>
                    {m.market} · ROI {m.roi.toFixed(2)} · {m.hitRate}%
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {snapshot?.weightRecommendation ? (
            <p className="gp-learning-panel__rec gp-type-caption">
              Calibração sugerida: {snapshot.weightRecommendation.rationale}
            </p>
          ) : null}

          {snapshot?.lateGoal?.description ? (
            <p className="gp-learning-panel__late gp-type-caption">
              {snapshot.lateGoal.description}
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
