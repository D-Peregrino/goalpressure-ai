"use client";

import { useEffect, useState } from "react";
import type { AutonomousAlertSnapshot } from "@/lib/autonomous/autonomousAlert.types";

const PRIORITY_LABEL: Record<string, string> = {
  baixa: "Baixa",
  moderada: "Moderada",
  alta: "Alta",
  critica: "Crítica",
};

export default function AutonomousAlertsPanel() {
  const [data, setData] = useState<AutonomousAlertSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/autonomous/core", { cache: "no-store" });
        const body = await res.json();
        if (!cancelled && body?.alertEngine) {
          setData(body.alertEngine as AutonomousAlertSnapshot);
          setError(false);
        }
      } catch {
        if (!cancelled) setError(true);
      }
    };
    void load();
    const id = window.setInterval(load, 12_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const m = data?.metrics;

  return (
    <section className="gp-auto-alerts">
      <header className="gp-auto-alerts__head">
        <div>
          <h3 className="gp-auto-alerts__title">Alertas autônomos</h3>
          <p className="gp-auto-alerts__sub">
            Monitoramento contínuo com leitura contextual e envio operacional
          </p>
        </div>
        {m ? (
          <span
            className={`gp-auto-alerts__status ${m.enabled ? "gp-auto-alerts__status--on" : ""}`}
          >
            {m.enabled ? (m.sandboxMode ? "Sandbox" : "Ativo") : "Pausado"}
          </span>
        ) : null}
      </header>

      {error ? (
        <p className="gp-auto-alerts__empty">Aguardando ciclo de monitoramento autônomo.</p>
      ) : !data ? (
        <p className="gp-auto-alerts__empty">Carregando alertas autônomos…</p>
      ) : (
        <>
          <div className="gp-auto-alerts__metrics">
            <div>
              <span>Enviados</span>
              <strong>{m?.alertsSent ?? 0}</strong>
            </div>
            <div>
              <span>Bloqueados</span>
              <strong>{m?.alertsBlocked ?? 0}</strong>
            </div>
            <div>
              <span>Precisão contextual</span>
              <strong>{m?.contextualPrecisionPct ?? 0}%</strong>
            </div>
            <div>
              <span>Partidas monitoradas</span>
              <strong>{m?.matchesMonitored ?? 0}</strong>
            </div>
          </div>

          <div className="gp-auto-alerts__lists">
            <div>
              <h4>Mais perigosos</h4>
              <ul>
                {(data.watchlist.maisPerigosos.length
                  ? data.watchlist.maisPerigosos
                  : []
                ).map((w) => (
                  <li key={w.fixtureId}>
                    {w.matchLabel} · {w.minute}&apos; · {w.reason}
                  </li>
                ))}
                {data.watchlist.maisPerigosos.length === 0 ? (
                  <li className="gp-auto-alerts__muted">Nenhum jogo nesta faixa</li>
                ) : null}
              </ul>
            </div>
            <div>
              <h4>Mais promissores</h4>
              <ul>
                {data.watchlist.maisPromissores.map((w) => (
                  <li key={w.fixtureId}>
                    {w.matchLabel} · score {w.score}
                  </li>
                ))}
                {data.watchlist.maisPromissores.length === 0 ? (
                  <li className="gp-auto-alerts__muted">Nenhum jogo nesta faixa</li>
                ) : null}
              </ul>
            </div>
          </div>

          <div className="gp-auto-alerts__feed">
            <h4>Últimos alertas</h4>
            {data.recentAlerts.length === 0 ? (
              <p className="gp-auto-alerts__muted">Nenhum alerta registrado neste ciclo.</p>
            ) : (
              <ul>
                {data.recentAlerts.slice(0, 12).map((a) => (
                  <li
                    key={a.id}
                    className={`gp-auto-alerts__row gp-auto-alerts__row--${a.priority}`}
                  >
                    <div className="gp-auto-alerts__row-top">
                      <span className="gp-auto-alerts__kind">{a.kindLabel}</span>
                      <span className="gp-auto-alerts__prio">
                        {PRIORITY_LABEL[a.priority] ?? a.priority}
                      </span>
                    </div>
                    <p className="gp-auto-alerts__match">
                      {a.matchLabel} · {a.minute}&apos;
                    </p>
                    <p className="gp-auto-alerts__headline">{a.headline}</p>
                    <p className="gp-auto-alerts__status-line">Status: {a.acao}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </section>
  );
}
