"use client";

import { memo } from "react";

function ChaosRadarMiniInner({ level }: { level: number }) {
  const v = Math.min(100, Math.max(0, level));
  const hot = v >= 65;

  return (
    <div className={`gp-chaos-mini ${hot ? "gp-chaos-mini--hot" : ""}`}>
      <svg viewBox="0 0 48 48" className="gp-chaos-mini__svg" aria-hidden>
        <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(15,23,41,0.08)" strokeWidth="4" />
        <circle
          cx="24"
          cy="24"
          r="20"
          fill="none"
          stroke="var(--gp-red)"
          strokeWidth="4"
          strokeDasharray={`${(v / 100) * 125} 125`}
          strokeLinecap="round"
          transform="rotate(-90 24 24)"
        />
      </svg>
      <span className="gp-chaos-mini__value tabular-nums">{Math.round(v)}</span>
      <span className="gp-chaos-mini__label">Pressão</span>
    </div>
  );
}

export default memo(ChaosRadarMiniInner);
