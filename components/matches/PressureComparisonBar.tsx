"use client";

import { clampPercent } from "@/lib/ui/matchFormatting";
import { getTeamColor } from "@/lib/ui/teamColors";

export default function PressureComparisonBar({
  homeTeam,
  awayTeam,
  homePressure,
  awayPressure,
  dominantSide,
}: {
  homeTeam: string;
  awayTeam: string;
  homePressure: number;
  awayPressure: number;
  dominantSide?: "home" | "away" | "balanced";
}) {
  const sum = Math.max(1, homePressure + awayPressure);
  const homePct = clampPercent((homePressure / sum) * 100);
  const awayPct = 100 - homePct;
  const homeColor = getTeamColor(homeTeam);
  const awayColor = getTeamColor(awayTeam);

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between font-mono-data text-[11px] text-[var(--muted)]">
        <span style={{ color: homeColor }}>{Math.round(homePressure)}</span>
        <span className="uppercase tracking-wide">Pressão ofensiva</span>
        <span style={{ color: awayColor }}>{Math.round(awayPressure)}</span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-[var(--gp-gray-light)]">
        <div
          className="transition-all duration-500"
          style={{ width: `${homePct}%`, background: homeColor, opacity: dominantSide === "away" ? 0.55 : 0.85 }}
        />
        <div
          className="transition-all duration-500"
          style={{ width: `${awayPct}%`, background: awayColor, opacity: dominantSide === "home" ? 0.55 : 0.85 }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-[var(--muted)]">
        <span>{homePct.toFixed(0)}%</span>
        <span>{awayPct.toFixed(0)}%</span>
      </div>
    </div>
  );
}
