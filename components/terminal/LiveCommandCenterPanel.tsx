"use client";

import { useEffect, useState } from "react";
import type { DispatchEngineSnapshot } from "@/lib/execution/execution.types";

export default function LiveCommandCenterPanel() {
  const [snapshot, setSnapshot] = useState<DispatchEngineSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/execution/dispatch-feed", {
          cache: "no-store",
        });
        const body = await res.json();
        if (!cancelled && body?.snapshot) setSnapshot(body.snapshot);
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(load, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  return (
    <section className="gp-command-center">
      <header className="gp-command-center__head">
        <h2 className="gp-type-title">Central de alertas</h2>
        <span className="gp-sport-badge gp-sport-badge--live">Despacho</span>
      </header>
      <div className="gp-command-center__kpis">
        <div>
          <p className="gp-type-caption">Dispatch rate/h</p>
          <p className="gp-command-center__value tabular-nums">
            {snapshot?.dispatchRatePerHour ?? 0}
          </p>
        </div>
        <div>
          <p className="gp-type-caption">Sinais ativos</p>
          <p className="gp-command-center__value tabular-nums">
            {snapshot?.activeSignals ?? 0}
          </p>
        </div>
        <div>
          <p className="gp-type-caption">Críticos</p>
          <p className="gp-command-center__value tabular-nums gp-command-center__value--critical">
            {snapshot?.criticalCount ?? 0}
          </p>
        </div>
        <div>
          <p className="gp-type-caption">Telegram</p>
          <p className="gp-command-center__value tabular-nums">
            {snapshot?.telegramSentCount ?? 0}
          </p>
        </div>
        <div>
          <p className="gp-type-caption">Fila</p>
          <p className="gp-command-center__value tabular-nums">
            {snapshot?.queueSize ?? 0}
          </p>
        </div>
        <div>
          <p className="gp-type-caption">EV médio</p>
          <p className="gp-command-center__value tabular-nums">
            {snapshot?.avgEvPercent != null ? `${snapshot.avgEvPercent}%` : "—"}
          </p>
        </div>
      </div>
      {snapshot?.feed && snapshot.feed.length > 0 ? (
        <ul className="gp-command-center__feed">
          {snapshot.feed.slice(0, 5).map((d) => (
            <li
              key={d.id}
              className={`gp-command-center__item gp-command-center__item--${d.urgency.toLowerCase()}`}
            >
              <span className="gp-command-center__urgency">{d.urgency}</span>
              <strong>{d.matchLabel}</strong>
              <p>{d.headline}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="gp-type-caption text-muted">
          Aguardando ciclo de dispatch operacional.
        </p>
      )}
    </section>
  );
}
