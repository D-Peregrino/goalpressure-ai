"use client";

export default function MarketMiniPanel({
  markets,
  primaryOdd,
}: {
  markets: { market: string; odd?: number; edge?: number; ev?: number }[];
  primaryOdd?: number;
}) {
  const rows = markets.length > 0 ? markets.slice(0, 3) : [];
  if (rows.length === 0 && primaryOdd == null) {
    return (
      <p className="font-mono-data text-[11px] text-[var(--muted)]">Odds indisponíveis</p>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((m) => (
        <div key={m.market} className="flex items-center justify-between gap-2 font-mono-data text-[11px]">
          <span className="truncate text-[var(--muted)]">{m.market}</span>
          <span className="shrink-0 tabular-nums">
            {m.odd != null ? m.odd.toFixed(2) : "—"}
            {m.edge != null && (
              <span className="ml-2 text-[#FF2B2B]">+{m.edge.toFixed(1)}%</span>
            )}
          </span>
        </div>
      ))}
      {primaryOdd != null && rows.length === 0 && (
        <div className="flex justify-between font-mono-data text-[11px]">
          <span className="text-[var(--muted)]">Principal</span>
          <span className="font-semibold tabular-nums">{primaryOdd.toFixed(2)}</span>
        </div>
      )}
    </div>
  );
}
