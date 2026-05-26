"use client";

import { useCallback, useEffect, useState } from "react";
import type { PersistenceHealthResponse } from "@/lib/persistence/persistenceObservability.types";
import type { PersistenceStatsResponse } from "@/lib/persistence/persistenceObservability.types";
import type { PersistenceRecentResponse } from "@/lib/persistence/persistenceObservability.types";

function statusLabel(status: PersistenceHealthResponse["status"]): string {
  if (status === "healthy") return "Operacional";
  if (status === "degraded") return "Degradado";
  return "Indisponível";
}

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function PersistenceHealthPanel() {
  const [health, setHealth] = useState<PersistenceHealthResponse | null>(null);
  const [stats, setStats] = useState<PersistenceStatsResponse | null>(null);
  const [recent, setRecent] = useState<PersistenceRecentResponse | null>(null);

  const load = useCallback(async () => {
    try {
      const [hRes, sRes, rRes] = await Promise.all([
        fetch("/api/persistence/health", { cache: "no-store" }),
        fetch("/api/persistence/stats", { cache: "no-store" }),
        fetch("/api/persistence/recent?limit=8", { cache: "no-store" }),
      ]);
      const [h, s, r] = await Promise.all([
        hRes.json(),
        sRes.json(),
        rRes.json(),
      ]);
      if (h?.generatedAt) setHealth(h as PersistenceHealthResponse);
      if (s?.generatedAt) setStats(s as PersistenceStatsResponse);
      if (r?.generatedAt) setRecent(r as PersistenceRecentResponse);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 14_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!health || !stats) {
    return (
      <section className="gp-persist-health">
        <p className="gp-persist-health__empty">Carregando saúde da persistência…</p>
      </section>
    );
  }

  return (
    <section className="gp-persist-health">
      <header className="gp-persist-health__head">
        <div>
          <h3 className="gp-persist-health__title">Saúde da persistência</h3>
          <p className="gp-persist-health__sub">
            Observabilidade institucional da gravação histórica contextual
          </p>
        </div>
        <span
          className={`gp-persist-health__pill gp-persist-health__pill--${health.status}`}
        >
          {statusLabel(health.status)}
        </span>
      </header>

      <div className="gp-persist-health__indicators">
        <div>
          <span>Banco conectado</span>
          <strong>{health.databaseConnected ? "Sim" : "Não"}</strong>
        </div>
        <div>
          <span>Última gravação</span>
          <strong>{formatTime(stats.lastWriteAt)}</strong>
        </div>
        <div>
          <span>Inserts/min</span>
          <strong>{stats.insertsPerMinute}</strong>
        </div>
        <div>
          <span>Queue</span>
          <strong>
            {stats.queue.cycleInProgress
              ? "Ciclo ativo"
              : stats.queue.deferredPending
                ? "Fase 2 pendente"
                : "Livre"}
          </strong>
        </div>
        <div>
          <span>Throttle</span>
          <strong>
            {health.throttleActive
              ? `${stats.throttle.cacheEntries} chaves`
              : "Inativo"}
          </strong>
        </div>
        <div>
          <span>Volume histórico</span>
          <strong>{stats.historicalVolumeDatabase}</strong>
        </div>
      </div>

      <div className="gp-persist-health__section">
        <h4>Tabelas ativas</h4>
        <ul className="gp-persist-health__tables">
          {health.tables.map((t) => (
            <li key={t.table}>
              <span className="gp-persist-health__table-name">{t.label}</span>
              <span className="gp-persist-health__table-vol">{t.rowCount}</span>
              <span className="gp-persist-health__table-time">
                {t.active ? formatTime(t.lastRecordedAt) : "—"}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="gp-persist-health__cols">
        <div>
          <h4>Volume por tipo (sessão → banco)</h4>
          <ul className="gp-persist-health__list">
            <li>Snapshots · {stats.snapshotsSaved} gravados</li>
            <li>Contextuais · {stats.contextualReadings}</li>
            <li>Preditivo · {stats.predictiveHistory}</li>
            <li>Alertas · {stats.autonomousAlerts}</li>
            <li>Outcomes · {stats.matchOutcomes}</li>
          </ul>
        </div>
        <div>
          <h4>Operação</h4>
          <ul className="gp-persist-health__list">
            <li>Fixtures monitorados · {stats.fixturesMonitored}</li>
            <li>Último ciclo · {formatTime(stats.lastCycleAt)}</li>
            <li>Registros no ciclo · {stats.lastCycleRows}</li>
            <li>Falhas (sessão) · {stats.failureCountSession}</li>
            {health.sandboxMode ? (
              <li className="gp-persist-health__warn">Modo sandbox — sem gravação real</li>
            ) : null}
          </ul>
        </div>
      </div>

      {stats.failures.length > 0 ? (
        <div className="gp-persist-health__section">
          <h4>Falhas de persistência recentes</h4>
          <ul className="gp-persist-health__failures">
            {stats.failures.slice(0, 4).map((f) => (
              <li key={`${f.at}-${f.table}`}>
                <span>{formatTime(f.at)} · {f.table}</span>
                <span className="gp-persist-health__fail-msg">{f.message}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recent && recent.items.length > 0 ? (
        <div className="gp-persist-health__section">
          <h4>Gravações recentes</h4>
          <ul className="gp-persist-health__recent">
            {recent.items.slice(0, 6).map((item) => (
              <li key={`${item.table}-${item.fixtureId}-${item.recordedAt}`}>
                <span className="gp-persist-health__recent-label">{item.tableLabel}</span>
                <span>
                  {item.fixtureId} · {item.minute != null ? `${item.minute}'` : "—"} ·{" "}
                  {item.summary}
                </span>
                <span className="gp-persist-health__recent-time">
                  {formatTime(item.recordedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
