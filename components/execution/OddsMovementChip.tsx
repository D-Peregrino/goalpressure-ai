"use client";

import { TrendingDown, TrendingUp, Minus } from "lucide-react";

export default function OddsMovementChip({
  primaryOdd,
  edgePercent,
}: {
  primaryOdd?: number;
  edgePercent?: number | null;
}) {
  const edge = edgePercent ?? 0;
  const direction = edge >= 3 ? "up" : edge <= -1 ? "down" : "flat";

  const Icon =
    direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;

  const label =
    direction === "up"
      ? "Distorção favorável"
      : direction === "down"
        ? "Mercado comprimido"
        : "Estável";

  return (
    <span className={`gp-chip gp-chip--odds gp-chip--odds-${direction}`} title="Odds movement">
      <Icon className="h-3 w-3 shrink-0" />
      <span className="tabular-nums">{primaryOdd != null ? primaryOdd.toFixed(2) : "—"}</span>
      <span className="gp-chip__sub">{label}</span>
    </span>
  );
}
