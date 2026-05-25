"use client";

import DataSourceBadge from "@/components/ui/DataSourceBadge";
import type { ActiveDataSource } from "@/lib/data-source/config";
import type { LiveMatchFeedStatus } from "@/hooks/useLiveMatches";

function formatTs(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LiveDataSourceStrip({
  source,
  status,
  lastUpdated,
  matchCount,
  responseTimeMs,
  error,
  className = "",
}: {
  source: ActiveDataSource;
  status: LiveMatchFeedStatus;
  lastUpdated: number | null;
  matchCount: number;
  responseTimeMs?: number | null;
  error?: string | null;
  className?: string;
}) {
  const statusLabel =
    status === "live"
      ? "Sincronizado"
      : status === "empty"
        ? "Sem jogos ao vivo"
        : status === "loading"
          ? "Sincronizando…"
          : status === "stale"
            ? "Dados antigos"
            : status === "error"
              ? "Erro na API"
              : status;

  return (
    <div className={`gp-live-source-strip ${className}`.trim()}>
      <div className="gp-live-source-strip__row">
        <DataSourceBadge source={source} error={error} />
        <span className="gp-live-source-strip__label">
          Fonte ativa:{" "}
          <strong>{source === "sportmonks" ? "SportMonks" : source}</strong>
        </span>
      </div>
      <div className="gp-live-source-strip__meta">
        <span>Última atualização: {formatTs(lastUpdated)}</span>
        <span>Fixtures: {matchCount}</span>
        {responseTimeMs != null && <span>API: {responseTimeMs}ms</span>}
        <span className="gp-live-source-strip__status">{statusLabel}</span>
      </div>
      {error && <p className="gp-live-source-strip__error">{error}</p>}
    </div>
  );
}
