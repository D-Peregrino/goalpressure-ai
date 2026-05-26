"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";

const TOOLTIP_STYLE = {
  background: "#11161D",
  border: "1px solid #1A222C",
  borderRadius: 6,
  fontSize: 11,
  color: "#F4F7FA",
};

export default function TerminalChartsPanel({ matches }: { matches: EnrichedLiveMatch[] }) {
  const pressureSeries = useMemo(() => {
    const top = [...matches]
      .filter((m) => m.isLive)
      .sort((a, b) => b.pressureScore - a.pressureScore)
      .slice(0, 1)[0];
    if (!top) {
      return Array.from({ length: 12 }, (_, i) => ({
        t: `${i * 5}'`,
        pressure: 20 + Math.sin(i) * 8,
        ev: 0.02 + i * 0.005,
      }));
    }
    const base = top.pressureScore;
    return Array.from({ length: 12 }, (_, i) => ({
      t: `${Math.max(0, (top.minute ?? 0) - 55 + i * 5)}'`,
      pressure: Math.max(0, base - 15 + i * 2.5 + Math.sin(i * 0.8) * 6),
      ev: (top.ev ?? 0.05) + Math.sin(i) * 0.02,
    }));
  }, [matches]);

  const evSeries = useMemo(() => {
    return [...matches]
      .filter((m) => m.ev != null && m.ev > 0)
      .sort((a, b) => (b.ev ?? 0) - (a.ev ?? 0))
      .slice(0, 8)
      .map((m) => ({
        match: `${m.homeTeam.slice(0, 8)}`,
        ev: Number(((m.ev ?? 0) * 100).toFixed(1)),
        edge: m.edgePercent ?? 0,
      }));
  }, [matches]);

  return (
    <div className="gp-bloomberg__charts-row">
      <div className="gp-bloomberg__card-glow p-4">
        <p className="mb-2 font-[family-name:var(--font-orbitron)] text-xs font-semibold tracking-wide">
          Pressure timeline
        </p>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pressureSeries}>
              <defs>
                <linearGradient id="pressureGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF2B2B" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="#FF2B2B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#1A222C" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="t" tick={{ fill: "#F4F7FA55", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#F4F7FA55", fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey="pressure"
                stroke="#FF2B2B"
                fill="url(#pressureGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="gp-bloomberg__card-glow p-4">
        <p className="mb-2 font-[family-name:var(--font-orbitron)] text-xs font-semibold tracking-wide">
          EV distribution
        </p>
        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evSeries.length ? evSeries : [{ match: "—", ev: 0, edge: 0 }]}>
              <CartesianGrid stroke="#1A222C" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="match" tick={{ fill: "#F4F7FA55", fontSize: 9 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#F4F7FA55", fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Line type="monotone" dataKey="ev" stroke="#FF4D4D" strokeWidth={2} dot={{ r: 3, fill: "#FF2B2B" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
