"use client";

import { useEffect, useState } from "react";
import type { DispatchEngineSnapshot } from "@/lib/execution/execution.types";

export default function OperatorModePanel() {
  const [snapshot, setSnapshot] = useState<DispatchEngineSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/execution/dispatch-feed", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.snapshot) setSnapshot(body.snapshot);
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

  const critical = (snapshot?.feed ?? []).filter((f) => f.urgency === "CRITICAL");

  return (
    <section className="gp-operator-mode" aria-label="Modo operador">
      <header className="gp-operator-mode__head">
        <h2 className="gp-type-title">Modo operador</h2>
        <span className="gp-sport-badge">CENTRAL</span>
      </header>

      <div className="gp-operator-mode__focus">
        <p className="gp-type-caption">Foco principal</p>
        <p className="gp-operator-mode__focus-value">
          {snapshot?.primaryFixtureId
            ? `Fixture ${snapshot.primaryFixtureId}`
            : "Aguardando prioridade"}
        </p>
      </div>

      <div className="gp-operator-mode__grid">
        <div>
          <p className="gp-type-caption">Monitorados</p>
          <p className="tabular-nums">{snapshot?.monitoredFixtures.length ?? 0}</p>
        </div>
        <div>
          <p className="gp-type-caption">Heat crítico</p>
          <p className="tabular-nums gp-operator-mode__critical">{critical.length}</p>
        </div>
        <div>
          <p className="gp-type-caption">Fila</p>
          <p className="tabular-nums">{snapshot?.queue.length ?? 0}</p>
        </div>
      </div>

      {critical.length > 0 ? (
        <ul className="gp-operator-mode__critical-list">
          {critical.map((c) => (
            <li key={c.id}>
              <strong>{c.matchLabel}</strong> — {c.headline}
            </li>
          ))}
        </ul>
      ) : null}

      {snapshot?.queue && snapshot.queue.length > 0 ? (
        <div className="gp-operator-mode__queue">
          <p className="gp-type-caption">Fila de sinais</p>
          <ul>
            {snapshot.queue.slice(0, 6).map((q) => (
              <li key={q.id}>
                {q.urgency} · {q.matchLabel} · {q.signalType}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
