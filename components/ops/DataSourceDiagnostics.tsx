"use client";

import { useEffect, useState } from "react";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import type { ActiveDataSource } from "@/lib/data-source/config";

type StatusPayload = {
  activeSource: ActiveDataSource;
  sportmonksTokenConfigured: boolean;
  seedEnabled: boolean;
  seedAllowed: boolean;
  lastFetchAt: string | null;
  lastFetchStatus: number | null;
  lastFetchEndpoint: string | null;
  matchCount: number;
  error: string | null;
  httpStatus: number | null;
};

type DiagnosticPayload = {
  tokenConfigured: boolean;
  endpointTested: string;
  httpStatus: number | null;
  matchCount: number;
  error: string | null;
  activeIncludes: string[];
  removedIncludes: string[];
};

export default function DataSourceDiagnostics() {
  const [status, setStatus] = useState<StatusPayload | null>(null);
  const [diag, setDiag] = useState<DiagnosticPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const [sRes, dRes] = await Promise.all([
          fetch("/api/data-source/status", { cache: "no-store" }),
          fetch("/api/sportmonks/diagnostic", { cache: "no-store" }),
        ]);
        const sJson = sRes.ok ? await sRes.json() : null;
        const dJson = dRes.ok ? await dRes.json() : null;
        if (!cancelled) {
          setStatus(sJson);
          setDiag(dJson);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (loading && !status) {
    return (
      <div className="gp-admin-settings gp-data-source-diag">
        <p className="text-sm text-muted">Carregando diagnóstico de fonte de dados…</p>
      </div>
    );
  }

  return (
    <div className="gp-admin-settings gp-data-source-diag">
      <section>
        <h2>Fonte de dados ao vivo</h2>
        {status && (
          <>
            <p className="mb-2">
              <DataSourceBadge source={status.activeSource} error={status.error} />
            </p>
            <ul className="text-sm">
              <li>Token SportMonks: {status.sportmonksTokenConfigured ? "sim" : "não"}</li>
              <li>GP_SEED_LIVE: {status.seedEnabled ? "true" : "false"}</li>
              <li>Seed permitido: {status.seedAllowed ? "sim" : "não"}</li>
              <li>Último fetch: {status.lastFetchAt ?? "—"}</li>
              <li>HTTP: {status.lastFetchStatus ?? status.httpStatus ?? "—"}</li>
              <li>Jogos: {status.matchCount}</li>
              {status.lastFetchEndpoint && (
                <li>Endpoint: {status.lastFetchEndpoint}</li>
              )}
              {status.error && <li className="text-amber-400">Erro: {status.error}</li>}
            </ul>
          </>
        )}
      </section>
      {diag && (
        <section>
          <h2>SportMonks diagnostic</h2>
          <ul className="text-sm">
            <li>Teste: {diag.endpointTested}</li>
            <li>HTTP: {diag.httpStatus ?? "—"}</li>
            <li>Jogos in-play: {diag.matchCount}</li>
            <li>Includes ativos: {diag.activeIncludes.join(", ") || "—"}</li>
            {diag.removedIncludes.length > 0 && (
              <li>Includes removidos (plano): {diag.removedIncludes.join(", ")}</li>
            )}
            {diag.error && <li className="text-amber-400">{diag.error}</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
