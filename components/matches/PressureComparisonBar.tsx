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
    <div className="gp-flow-pressure">
      <div className="gp-flow-pressure__track">
        <div
          className="gp-flow-pressure__seg gp-flow-pressure__seg--home"
          style={{
            width: `${homePct}%`,
            background: homeColor,
            opacity: dominantSide === "away" ? 0.45 : 0.75,
          }}
        />
        <div
          className="gp-flow-pressure__seg gp-flow-pressure__seg--away"
          style={{
            width: `${awayPct}%`,
            background: awayColor,
            opacity: dominantSide === "home" ? 0.45 : 0.75,
          }}
        />
      </div>
    </div>
  );
}
