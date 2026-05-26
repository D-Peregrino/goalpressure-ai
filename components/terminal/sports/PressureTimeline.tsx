"use client";

import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
} from "recharts";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { getPressureScoreHistory } from "@/lib/engine/pressure/rollingWindow";

type WindowMode = "total" | "10" | "5";

function buildBars(
  match: EnrichedLiveMatch,
  mode: WindowMode
): { minute: number; value: number; side: "home" | "away" }[] {
  const history = getPressureScoreHistory(match.matchId);
  const currentMin = match.minute ?? 0;
  const slots = [15, 30, 45, 60, 75, 90];

  if (history.length >= 2) {
    const chunk = mode === "10" ? 2 : mode === "5" ? 1 : history.length;
    const slice = history.slice(-Math.max(chunk, 6));
    return slice.map((pressure, i) => {
      const minute = Math.min(90, Math.round((currentMin / slice.length) * (i + 1)) || (i + 1) * 15);
      const homeShare = match.homePressure / Math.max(1, match.homePressure + match.awayPressure);
      const side: "home" | "away" = pressure * homeShare >= pressure * (1 - homeShare) ? "home" : "away";
      const magnitude = Math.round(pressure * (side === "home" ? 1 : -1));
      return { minute, value: magnitude, side };
    });
  }

  if (!match.isLive || currentMin <= 0) {
    return slots.map((minute) => ({ minute, value: 0, side: "home" as const }));
  }

  const homeShare = match.homePressure / Math.max(1, match.homePressure + match.awayPressure);
  const base = match.pressureScore;
  return slots
    .filter((m) => m <= Math.max(currentMin, 15))
    .map((minute) => {
      const wave = Math.sin(minute / 12) * 12;
      const side: "home" | "away" = homeShare >= 0.5 ? "home" : "away";
      const sign = side === "home" ? 1 : -1;
      const value = Math.round((base / 3 + wave) * sign * (minute <= currentMin ? 1 : 0));
      return { minute, value, side };
    });
}

export default function PressureTimeline({ match }: { match: EnrichedLiveMatch }) {
  const [mode, setMode] = useState<WindowMode>("total");
  const data = useMemo(() => buildBars(match, mode), [match, mode]);
  const hasData = data.some((d) => d.value !== 0);

  return (
    <div className="gp-sports__timeline-block">
      <div className="gp-sports__timeline-head">
        <span className="gp-sports__timeline-title">Indicadores de pressão</span>
        <div className="gp-sports__timeline-btns">
          {(
            [
              ["total", "Total"],
              ["10", "10'"],
              ["5", "5'"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={mode === key ? "button--on" : undefined}
              onClick={() => setMode(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-[#6B7280] py-6 text-center">Aguardando dados de pressão</p>
      ) : (
        <div className="gp-pressure-timeline">
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={data} stackOffset="sign" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="minute" tick={{ fontSize: 10, fill: "#6B7280" }} axisLine={false} tickLine={false} />
              <ReferenceLine y={0} stroke="#94a3b8" />
              <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.side === "home" ? "#2563EB" : "#FF7A45"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="gp-pressure-timeline__axis">
            <span>0</span>
            <span>15</span>
            <span>30</span>
            <span>45</span>
            <span>60</span>
            <span>75</span>
            <span>90+</span>
          </div>
        </div>
      )}
    </div>
  );
}
