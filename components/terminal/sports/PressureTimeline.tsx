"use client";

import { useMemo } from "react";
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
import type { TimelineWindow } from "@/lib/terminal/sportsDisplay";
import { cn } from "@/lib/utils";

function buildBars(
  match: EnrichedLiveMatch,
  mode: TimelineWindow
): { minute: number; value: number; side: "home" | "away" }[] {
  const history = getPressureScoreHistory(match.matchId);
  const currentMin = match.minute ?? 0;
  const slots = [15, 30, 45, 60, 75, 90];

  if (history.length >= 2) {
    const take =
      mode === "10" ? Math.min(10, history.length) : mode === "5" ? Math.min(5, history.length) : history.length;
    const slice = history.slice(-take);
    return slice.map((pressure, i) => {
      const minute =
        mode === "total"
          ? slots[Math.min(slots.length - 1, i)] ?? (i + 1) * 15
          : Math.min(90, currentMin - (slice.length - 1 - i) * (mode === "5" ? 1 : 2));
      const homeShare = match.homePressure / Math.max(1, match.homePressure + match.awayPressure);
      const side: "home" | "away" =
        pressure * homeShare >= pressure * (1 - homeShare) ? "home" : "away";
      const magnitude = Math.round(pressure * (side === "home" ? 1 : -1));
      return { minute, value: magnitude, side };
    });
  }

  if (!match.isLive || currentMin <= 0) {
    return slots.map((minute) => ({ minute, value: 0, side: "home" as const }));
  }

  const homeShare = match.homePressure / Math.max(1, match.homePressure + match.awayPressure);
  const base = match.pressureScore;
  const filtered =
    mode === "10"
      ? slots.filter((m) => m > currentMin - 10 && m <= currentMin)
      : mode === "5"
        ? slots.filter((m) => m > currentMin - 5 && m <= currentMin)
        : slots.filter((m) => m <= Math.max(currentMin, 15));

  const useSlots = filtered.length > 0 ? filtered : slots.filter((m) => m <= currentMin);

  return useSlots.map((minute) => {
    const wave = Math.sin(minute / 12) * 12;
    const side: "home" | "away" = homeShare >= 0.5 ? "home" : "away";
    const sign = side === "home" ? 1 : -1;
    const value = Math.round((base / 3 + wave) * sign);
    return { minute, value, side };
  });
}

export default function PressureTimeline({
  match,
  window,
  onWindowChange,
}: {
  match: EnrichedLiveMatch;
  window: TimelineWindow;
  onWindowChange: (w: TimelineWindow) => void;
}) {
  const data = useMemo(() => buildBars(match, window), [match, window]);
  const hasData = data.some((d) => d.value !== 0);

  const windowLabel =
    window === "total" ? "Partida inteira" : window === "10" ? "Últimos 10 minutos" : "Últimos 5 minutos";

  return (
    <div className="gp-sports__timeline-block">
      <div className="gp-sports__timeline-head">
        <div>
          <span className="gp-sports__timeline-title">Indicadores de pressão</span>
          <p className="gp-sports__timeline-subtitle">Linha do tempo ofensiva</p>
        </div>
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
              className={cn(window === key && "button--on")}
              onClick={() => onWindowChange(key)}
              aria-pressed={window === key}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <p className="gp-sports__timeline-window-label">Janela: {windowLabel}</p>

      {!hasData ? (
        <p className="text-sm text-[#6B7280] py-6 text-center">Aguardando dados de pressão</p>
      ) : (
        <>
          <div className="gp-pressure-timeline">
            <ResponsiveContainer width="100%" height={100}>
              <BarChart
                data={data}
                stackOffset="sign"
                margin={{ top: 4, right: 4, left: 4, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="minute"
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
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
          <div className="gp-pressure-timeline-legend">
            <span>
              <i className="gp-legend-dot gp-legend-dot--home" aria-hidden /> Mandante (para cima)
            </span>
            <span>
              <i className="gp-legend-dot gp-legend-dot--away" aria-hidden /> Visitante (para baixo)
            </span>
          </div>
        </>
      )}
    </div>
  );
}
