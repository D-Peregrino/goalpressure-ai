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
    if (points && points.length >= 4) return points.slice(-24);
    return null;
  }, [points]);

  const accent = teamName ? getTeamColor(teamName) : "#FF2B2B";

  if (!bars) {
    return (
      <div className="flex h-10 items-center justify-center rounded-lg border border-dashed border-[var(--border)] bg-[var(--gp-white-tech)]">
        <p className="font-mono-data text-[10px] text-[var(--muted)]">
          {collecting ? "Coletando histórico…" : "Timeline indisponível"}
        </p>
      </div>
    );
  }

  const max = Math.max(...bars, 1);
  return (
    <div className="flex h-10 items-end gap-px rounded-lg bg-[var(--gp-white-tech)] px-1 py-1">
      {bars.map((v, i) => (
        <div
          key={i}
          className="min-w-0 flex-1 rounded-t-sm opacity-80"
          style={{
            height: `${Math.max(12, (v / max) * 100)}%`,
            background: accent,
          }}
        />
      ))}
    </div>
  );
}
