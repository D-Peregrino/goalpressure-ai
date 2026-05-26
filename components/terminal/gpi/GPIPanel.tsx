"use client";

import { useEffect, useState } from "react";
import type { GPIEngineSnapshot } from "@/lib/gpi/gpi.types";

export default function GPIPanel() {
  const [data, setData] = useState<GPIEngineSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/gpi/live", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.snapshot) {
          setData(body.snapshot as GPIEngineSnapshot);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(load, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <section className="gp-gpi-panel">
        <p className="gp-gpi-panel__empty">Carregando GoalPressure Index…</p>
      </section>
    );
  }

  return (
    <section className="gp-gpi-panel">
      <header className="gp-gpi-panel__head">
        <div>
          <h3 className="gp-gpi-panel__title">GoalPressure Index</h3>
          <p className="gp-gpi-panel__sub">Ranking operacional ao vivo por intensidade contextual</p>
        </div>
        <span
          className={`gp-gpi-panel__pill ${data.enabled ? "gp-gpi-panel__pill--on" : ""}`}
        >
          {data.sandboxMode ? "Sandbox" : data.enabled ? "Ativo" : "Pausado"}
        </span>
      </header>

      <div className="gp-gpi-panel__metrics">
        <div>
          <span>Média GPI</span>
          <strong>{data.metrics.avgScore}</strong>
        </div>
        <div>
          <span>GPI ≥ 85</span>
          <strong>{data.metrics.highGpiCount}</strong>
        </div>
        <div>
          <span>Fixtures</span>
          <strong>{data.metrics.fixturesTracked}</strong>
        </div>
      </div>

      <ul className="gp-gpi-panel__list">
        {data.readings.length === 0 ? (
          <li className="gp-gpi-panel__muted">Aguardando jogos ao vivo</li>
        ) : (
          data.readings.slice(0, 8).map((r) => (
            <li key={r.fixtureId}>
              <span className="gp-gpi-panel__score">{r.score}</span>
              <div>
                <strong>{r.matchLabel}</strong>
                <span>
                  {r.classificationLabel} · {r.minute}&apos;
                </span>
              </div>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
