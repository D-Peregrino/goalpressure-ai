"use client";

import { memo } from "react";
import { getTeamColor } from "@/lib/ui/teamColors";

function MomentumBarInner({
  momentum,
  homeTeam,
  awayTeam,
  homePressure,
  awayPressure,
}: {
  momentum: number;
  homeTeam: string;
  awayTeam: string;
  homePressure: number;
  awayPressure: number;
}) {
  const total = Math.max(1, homePressure + awayPressure);
  const homePct = Math.round((homePressure / total) * 100);
  const awayPct = 100 - homePct;
  const m = Math.min(100, Math.max(0, momentum));

  return (
    <div className="gp-momentum-bar">
      <div className="gp-momentum-bar__header">
        <span className="gp-momentum-bar__label">Momentum live</span>
        <span className="gp-momentum-bar__value tabular-nums">{Math.round(m)}</span>
      </div>
      <div className="gp-momentum-bar__track">
        <span
          className="gp-momentum-bar__fill gp-momentum-bar__fill--home"
          style={{
            width: `${homePct}%`,
            background: getTeamColor(homeTeam),
          }}
        />
        <span
          className="gp-momentum-bar__fill gp-momentum-bar__fill--away"
          style={{
            width: `${awayPct}%`,
            background: getTeamColor(awayTeam),
          }}
        />
      </div>
      <div
        className="gp-momentum-bar__pulse"
        style={{ left: `${m}%` }}
        aria-hidden
      />
    </div>
  );
}

export default memo(MomentumBarInner);
