"use client";

import { useMemo } from "react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";

function heatColor(intensity: number): string {
  if (intensity >= 0.85) return "#FF2B2B";
  if (intensity >= 0.65) return "#FF4D4D";
  if (intensity >= 0.45) return "#8B3A3A";
  if (intensity >= 0.25) return "#3D4A5C";
  return "#1E2A3D";
}

export default function TerminalPressureHeatmap({ matches }: { matches: EnrichedLiveMatch[] }) {
  const cells = useMemo(() => {
    const sorted = [...matches]
      .sort((a, b) => b.pressureScore - a.pressureScore)
      .slice(0, 48);
    const grid: { id: string; label: string; intensity: number }[] = [];
    for (let i = 0; i < 48; i++) {
      const m = sorted[i];
      if (m) {
        grid.push({
          id: m.fixtureId,
          label: m.homeTeam.slice(0, 3),
          intensity: Math.min(1, m.pressureScore / 100),
        });
      } else {
        grid.push({ id: `empty-${i}`, label: "", intensity: 0.05 });
      }
    }
    return grid;
  }, [matches]);

  return (
    <div className="gp-bloomberg__card-glow p-4">
      <p className="mb-3 font-[family-name:var(--font-orbitron)] text-xs font-semibold tracking-wide text-[#F4F7FA]">
        Mapa de calor · pressão
      </p>
      <div className="gp-bloomberg__heatmap">
        {cells.map((c) => (
          <div
            key={c.id}
            className="gp-bloomberg__heatmap-cell"
            style={{ background: heatColor(c.intensity) }}
            title={c.label ? `${c.label} · ${Math.round(c.intensity * 100)}%` : undefined}
          />
        ))}
      </div>
      <div className="mt-3 flex justify-between text-[11px] text-[#AAB6C5]">
        <span>Baixa</span>
        <span className="text-[#FF4D4D]">Crítica</span>
      </div>
    </div>
  );
}
