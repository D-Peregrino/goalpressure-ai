"use client";

import Link from "next/link";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import type { ActiveDataSource } from "@/lib/data-source/config";

export default function LiveFeedEmptyState({
  source = "sportmonks",
  matchCount = 0,
  lastUpdated,
  responseTimeMs,
  error,
  compact = false,
}: {
  source?: ActiveDataSource;
  matchCount?: number;
  lastUpdated?: number | null;
  responseTimeMs?: number | null;
  error?: string | null;
  compact?: boolean;
}) {
  const updatedLabel = lastUpdated
    ? new Date(lastUpdated).toLocaleString("pt-BR")
    : "—";

  return (
    <div className={`gp-empty-state gp-empty-state--premium ${compact ? "gp-empty-state--compact" : ""}`}>
      <DataSourceBadge source={source} error={error} />
      <h3 className="gp-empty-state__title">
        Nenhuma partida ao vivo disponível no momento
      </h3>
      <p className="gp-empty-state__sub">
        A SportMonks não retornou jogos in-play neste ciclo. O sistema não preenche com
        dados fictícios — aguarde a próxima sincronização automática.
      </p>
      <ul className="gp-empty-state__stats">
        <li>Fixtures no feed: {matchCount}</li>
        <li>Última sincronização: {updatedLabel}</li>
        {responseTimeMs != null && <li>Tempo de resposta API: {responseTimeMs}ms</li>}
        <li>Status API: {error ? "erro" : "ok"}</li>
      </ul>
      {error && <p className="gp-empty-state__error">{error}</p>}
      {!compact && (
        <Link href="/api/sportmonks/diagnostic" className="gp-btn gp-btn--ghost gp-btn--sm" target="_blank">
          Diagnóstico SportMonks
        </Link>
      )}
    </div>
  );
}
