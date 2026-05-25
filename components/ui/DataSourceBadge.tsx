"use client";

import type { ActiveDataSource } from "@/lib/data-source/config";

export function dataSourceBadgeLabel(source: ActiveDataSource | string): string {
  switch (source) {
    case "sportmonks":
      return "DADOS REAIS · SPORTMONKS";
    case "seed":
      return "Seed dev (sem token SportMonks)";
    case "none":
      return "Sem fonte de dados";
    default:
      return String(source);
  }
}

export default function DataSourceBadge({
  source,
  error,
  className = "",
}: {
  source: ActiveDataSource | string;
  error?: string | null;
  className?: string;
}) {
  const isReal = source === "sportmonks";
  const isSeed = source === "seed";
  const variant = isReal
    ? "gp-sport-badge--live"
    : isSeed
      ? "gp-sport-badge--sync"
      : error
        ? "gp-sport-badge--warn"
        : "gp-sport-badge--off";

  return (
    <span
      className={`gp-sport-badge ${variant} ${className}`.trim()}
      title={error ?? undefined}
    >
      {dataSourceBadgeLabel(source)}
    </span>
  );
}
