"use client";

import { useEffect, useState } from "react";
import type { OperationalPersistenceSnapshot } from "@/lib/persistence/persistence.types";

export default function OperationalPersistencePanel() {
  const [data, setData] = useState<OperationalPersistenceSnapshot | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/autonomous/core", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.operationalPersistence) {
          setData(body.operationalPersistence as OperationalPersistenceSnapshot);
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = window.setInterval(load, 16_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (!data) {
    return (
      <section className="gp-ops-persist">
        <p className="gp-ops-persist__empty">Carregando persistência operacional…</p>
      </section>
    );
  }

  const db = data.dbCounts;

  return (
    <section className="gp-ops-persist">
      <header className="gp-ops-persist__head">
        <div>
          <h3 className="gp-ops-persist__title">Persistência operacional</h3>
          <p className="gp-ops-persist__sub">
            Gravação incremental de snapshots, leituras contextuais, preditivas e alertas
          </p>
        </div>
        <span
          className={`gp-ops-persist__pill ${data.enabled ? "gp-ops-persist__pill--on" : ""}`}
        >
          {data.sandboxMode ? "Sandbox" : data.enabled ? "Ativo" : "Pausado"}
        </span>
      </header>

      <div className="gp-ops-persist__metrics">
        <div>
          <span>Snapshots salvos (sessão)</span>
          <strong>{data.snapshotsSaved}</strong>
        </div>
        <div>
          <span>Fixtures monitorados</span>
          <strong>{data.fixturesMonitored}</strong>
        </div>
        <div>
          <span>Volume histórico (sessão)</span>
          <strong>{data.historicalVolume}</strong>
        </div>
        <div>
          <span>Taxa de gravação</span>
          <strong>{data.writeRatePerMinute}/min</strong>
        </div>
      </div>

      <div className="gp-ops-persist__share">
        <span>Uso contextual no banco</span>
        <strong>{data.contextualDbSharePct}%</strong>
        <span className="gp-ops-persist__muted">
          leituras contextuais sobre o volume total persistido
        </span>
      </div>

      <div className="gp-ops-persist__section">
        <h4>Volume no Supabase</h4>
        <ul className="gp-ops-persist__db-grid">
          <li>
            <span>Snapshots live</span>
            <strong>{db.liveMatchSnapshots}</strong>
          </li>
          <li>
            <span>Leituras contextuais</span>
            <strong>{db.contextualReadings}</strong>
          </li>
          <li>
            <span>Histórico preditivo</span>
            <strong>{db.predictiveHistory}</strong>
          </li>
          <li>
            <span>Alertas autônomos</span>
            <strong>{db.autonomousAlerts}</strong>
          </li>
          <li>
            <span>Outcomes</span>
            <strong>{db.matchOutcomes}</strong>
          </li>
        </ul>
      </div>

      {data.recentFixtures.length > 0 ? (
        <div className="gp-ops-persist__section">
          <h4>Fixtures recentes</h4>
          <ul className="gp-ops-persist__list">
            {data.recentFixtures.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {data.lastCycleAt ? (
        <p className="gp-ops-persist__note">
          Último ciclo: {new Date(data.lastCycleAt).toLocaleTimeString("pt-BR")} ·{" "}
          {data.lastCycleRows} registros processados
        </p>
      ) : null}

      {data.note ? <p className="gp-ops-persist__note">{data.note}</p> : null}
    </section>
  );
}
