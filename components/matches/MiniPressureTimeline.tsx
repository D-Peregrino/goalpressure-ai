"use client";

import { useMemo } from "react";
import { getTeamColor } from "@/lib/ui/teamColors";

export default function MiniPressureTimeline({
  points,
  teamName,
  collecting,
}: {
  points?: number[];
  teamName?: string;
  collecting?: boolean;
}) {
  const bars = useMemo(() => {
    if (points && points.length >= 4) return points.slice(-20);
    return null;
  }, [points]);

  const accent = teamName ? getTeamColor(teamName) : "#FF2B2B";

  if (!bars) {
    return (
      <div className="match-card__timeline flex items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--gp-white-tech)]">
        <p className="font-mono-data text-[11px] text-[var(--muted)]">
          {collecting ? "Coletando histórico de pressão…" : "Timeline indisponível"}
        </p>
      </div>
    );
  }

  const max = Math.max(...bars, 1);
  return (
    <div className="match-card__timeline flex items-end gap-px rounded-xl bg-[var(--gp-white-tech)] px-2 py-2">
      {bars.map((v, i) => (
        <div
          key={i}
          className="min-w-0 flex-1 rounded-t-sm"
          style={{
            height: `${Math.max(14, (v / max) * 100)}%`,
            background: accent,
            opacity: 0.65,
          }}
        />
      ))}
    </div>
  );
}
