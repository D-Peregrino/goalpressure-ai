"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";
import type { TimelineWindow } from "@/lib/terminal/sportsDisplay";
import { cn } from "@/lib/utils";
import TimelineEventMarker from "./TimelineEventMarker";
import { mapTimelineBars, mapTimelineEvents } from "./timelineMapper";

export default function SmartPressureTimeline({
  match,
  context,
  window,
  onWindowChange,
}: {
  match: EnrichedLiveMatch;
  context: MatchContextResult;
  window: TimelineWindow;
  onWindowChange: (w: TimelineWindow) => void;
}) {
  const bars = useMemo(() => mapTimelineBars(match, window), [match, window]);
  const events = useMemo(() => mapTimelineEvents(match, context, bars), [match, context, bars]);
  const hasData = bars.length > 1;

  const currentMinute = Math.max(1, Math.min(90, match.minute ?? 90));
  const last10Start = Math.max(1, currentMinute - 10);
  const windowLabel =
    window === "total" ? "Partida inteira" : window === "10" ? "Últimos 10 minutos" : "Últimos 5 minutos";

  return (
    <section className="gp-sports__timeline-block gp-smart-timeline">
      <div className="gp-sports__timeline-head">
        <div>
          <span className="gp-sports__timeline-title">Linha do tempo ofensiva</span>
          <p className="gp-sports__timeline-subtitle">
            Evolução da pressão por minuto (mandante e visitante)
          </p>
        </div>
        <div className="gp-sports__timeline-btns">
          {(
            [
              ["total", "Total"],
              ["10", "Últimos 10 min"],
              ["5", "Últimos 5 min"],
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
        <p className="text-sm text-[#6B7280] py-6 text-center">
          Aguardando histórico ofensivo da partida.
        </p>
      ) : (
        <>
          <div className="gp-pressure-timeline gp-smart-timeline__chart">
            <ResponsiveContainer width="100%" height={136}>
              <BarChart data={bars} margin={{ top: 10, right: 12, left: 6, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="minute"
                  type="number"
                  domain={[0, 90]}
                  ticks={[15, 30, 45, 60, 75, 90]}
                  tick={{ fontSize: 10, fill: "#6B7280" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide domain={[-100, 100]} />
                <ReferenceLine y={0} stroke="#94a3b8" />
                <ReferenceArea x1={last10Start} x2={currentMinute} fill="#eaf2ff" fillOpacity={0.55} />
                <ReferenceLine x={currentMinute} stroke="#ef4444" strokeDasharray="4 4" />
                <Bar dataKey="home" name="Mandante" fill="#2563EB" radius={[3, 3, 0, 0]} maxBarSize={14} />
                <Bar dataKey="awayNegative" name="Visitante" fill="#FF7A45" radius={[0, 0, 3, 3]} maxBarSize={14} />
                <Tooltip
                  cursor={{ fill: "rgba(100,116,139,0.08)" }}
                  contentStyle={{ borderRadius: 8, borderColor: "#e2e8f0", fontSize: 12 }}
                  labelFormatter={(label) => `${label}'`}
                />
              </BarChart>
            </ResponsiveContainer>

            <div className="gp-smart-timeline__overlay">
              {events.map((event) => {
                const leftPercent = (event.minute / 90) * 100;
                return <TimelineEventMarker key={`${event.kind}-${event.minute}`} event={event} leftPercent={leftPercent} />;
              })}
            </div>

            <div className="gp-pressure-timeline__axis">
              <span>0</span>
              <span>15</span>
              <span>30</span>
              <span>45</span>
              <span>60</span>
              <span>75</span>
              <span>90</span>
            </div>
          </div>

          <div className="gp-smart-timeline__legend">
            <span><i className="gp-legend-dot gp-legend-dot--home" /> azul = mandante</span>
            <span><i className="gp-legend-dot gp-legend-dot--away" /> laranja = visitante</span>
            <span><i className="gp-legend-dot gp-smart-timeline__dot--critical" /> vermelho = zona crítica</span>
            <span><i className="gp-legend-dot gp-smart-timeline__dot--low" /> cinza = baixa intensidade</span>
          </div>
        </>
      )}
    </section>
  );
}
