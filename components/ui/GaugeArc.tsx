"use client";

import { useMemo } from "react";

export default function GaugeArc({
  value,
  max = 100,
  label,
  color = "#ff2b2b",
}: {
  value: number;
  max?: number;
  label: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const dash = useMemo(() => {
    const r = 42;
    const c = 2 * Math.PI * r;
    const offset = c - (pct / 100) * c * 0.75;
    return { c, offset, r };
  }, [pct]);

  return (
    <div className="flex flex-col items-center">
      <svg width="120" height="88" viewBox="0 0 120 88" className="overflow-visible">
        <circle
          cx="60"
          cy="60"
          r={dash.r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
          strokeDasharray={`${dash.c * 0.75} ${dash.c}`}
          strokeLinecap="round"
          transform="rotate(135 60 60)"
        />
        <circle
          cx="60"
          cy="60"
          r={dash.r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash.c * 0.75} ${dash.c}`}
          strokeDashoffset={dash.offset}
          strokeLinecap="round"
          transform="rotate(135 60 60)"
          style={{ filter: `drop-shadow(0 0 8px ${color}55)` }}
        />
        <text
          x="60"
          y="58"
          textAnchor="middle"
          className="fill-foreground font-mono text-lg font-bold"
        >
          {Math.round(value)}
        </text>
      </svg>
      <p className="gp-label mt-1">{label}</p>
    </div>
  );
}
