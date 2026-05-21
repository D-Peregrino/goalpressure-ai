"use client";

import { getPressureTier, PRESSURE_STYLES } from "@/lib/pressureUtils";

interface PressureRadarProps {
  score: number;
  size?: number;
}

export default function PressureRadar({ score, size = 80 }: PressureRadarProps) {
  const clamped = Math.min(100, Math.max(0, score));
  const tier = getPressureTier(clamped);
  const styles = PRESSURE_STYLES[tier];
  const angleDeg = -135 + (clamped / 100) * 270;
  const rad = (angleDeg * Math.PI) / 180;
  const blipX = 50 + 34 * Math.cos(rad);
  const blipY = 50 + 34 * Math.sin(rad);

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <div
        className={`absolute inset-0 border border-card/80 ${styles.pulseRing}`}
        style={{ boxShadow: `inset 0 0 20px ${styles.radarGlow}` }}
      />
      <svg
        viewBox="0 0 100 100"
        className="relative h-full w-full"
        aria-hidden
      >
        <rect
          x="8"
          y="8"
          width="84"
          height="84"
          fill="none"
          stroke="rgba(26, 34, 44, 0.8)"
          strokeWidth="0.5"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="rgba(8, 11, 15, 0.6)"
          stroke="rgba(26, 34, 44, 0.9)"
          strokeWidth="0.75"
        />
        <circle
          cx="50"
          cy="50"
          r="28"
          fill="none"
          stroke="rgba(26, 34, 44, 0.6)"
          strokeWidth="0.5"
        />
        <circle
          cx="50"
          cy="50"
          r="14"
          fill="none"
          stroke="rgba(26, 34, 44, 0.4)"
          strokeWidth="0.5"
        />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
          const r = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1="50"
              y1="50"
              x2={50 + 42 * Math.cos(r)}
              y2={50 + 42 * Math.sin(r)}
              stroke="rgba(138, 150, 163, 0.12)"
              strokeWidth="0.35"
            />
          );
        })}
        <circle
          cx={blipX}
          cy={blipY}
          r="4"
          fill={styles.radarColor}
          className="animate-live-blink"
        />
        <circle cx="50" cy="50" r="1.5" fill="rgba(244, 247, 250, 0.7)" />
      </svg>

      <div
        className="radar-sweep pointer-events-none absolute inset-1 opacity-60"
        style={{
          background: `conic-gradient(from 0deg, transparent 0deg, ${styles.radarGlow} 42deg, transparent 72deg)`,
        }}
      />

      <span className="pointer-events-none absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[7px] uppercase tracking-widest text-muted/80">
        RDR
      </span>
    </div>
  );
}
