"use client";

import { memo, useId, useMemo } from "react";
import { motion } from "framer-motion";

function MiniMomentumChartInner({
  points,
  height = 36,
  className = "",
}: {
  points?: number[];
  height?: number;
  className?: string;
}) {
  const gradId = useId().replace(/:/g, "");

  const chart = useMemo(() => {
    const data = (points ?? []).filter((n) => Number.isFinite(n));
    if (data.length < 2) return null;

    const w = 100;
    const h = 100;
    const pad = 4;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = Math.max(1, max - min);
    const coords = data.map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - ((v - min) / span) * (h - pad * 2);
      return { x, y };
    });
    const d = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
    const last = data[data.length - 1] ?? 0;
    const prev = data[data.length - 2] ?? last;
    const trend = last > prev + 2 ? "up" : last < prev - 2 ? "down" : "flat";
    const lastPt = coords[coords.length - 1]!;
    return { d, lastPt, trend };
  }, [points]);

  if (!chart) {
    return (
      <div
        className={`gp-mini-momentum gp-mini-momentum--empty ${className}`}
        style={{ height }}
        aria-hidden
      >
        <span className="gp-mini-momentum__placeholder" />
      </div>
    );
  }

  return (
    <div className={`gp-mini-momentum ${className}`} style={{ height }} aria-hidden>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="gp-mini-momentum__svg">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255, 43, 43, 0.35)" />
            <stop offset="100%" stopColor="rgba(255, 43, 43, 0)" />
          </linearGradient>
        </defs>
        <path
          d={`${chart.d} L100,100 L0,100 Z`}
          fill={`url(#${gradId})`}
          opacity={0.5}
        />
        <motion.path
          d={chart.d}
          fill="none"
          stroke="var(--gp-red)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
        <circle
          cx={chart.lastPt.x}
          cy={chart.lastPt.y}
          r="3.5"
          fill="var(--gp-red)"
          className="gp-mini-momentum__dot"
        />
      </svg>
      <span className={`gp-mini-momentum__trend gp-mini-momentum__trend--${chart.trend}`} />
    </div>
  );
}

export default memo(MiniMomentumChartInner);
