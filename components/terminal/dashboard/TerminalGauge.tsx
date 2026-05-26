"use client";

import { cn } from "@/lib/utils";
import { roundDisplay } from "@/lib/terminal/formatDisplay";

export default function TerminalGauge({
  label,
  value,
  max = 100,
  unit = "",
  accent = false,
}: {
  label: string;
  value: number;
  max?: number;
  unit?: string;
  accent?: boolean;
}) {
  const safe = Number.isFinite(value) ? value : 0;
  const pct = Math.min(100, Math.max(0, (safe / max) * 100));
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  const display =
    unit === "%"
      ? `${roundDisplay(safe, 1)}${unit}`
      : `${roundDisplay(safe)}${unit}`;

  return (
    <div
      className={cn(
        "gp-bloomberg__card-glow flex flex-col items-center p-4",
        accent && "gp-bloomberg__card-glow--hot"
      )}
    >
      <div className="relative h-[88px] w-[88px]">
        <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#1E2A3D" strokeWidth="6" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={accent ? "#FF2B2B" : "#FF4D4D"}
            strokeWidth="6"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ filter: accent ? "drop-shadow(0 0 4px rgba(255,43,43,0.35))" : undefined }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="gp-bloomberg__mono text-lg font-semibold text-[#F4F7FA]">
            {display}
          </span>
        </div>
      </div>
      <p className="mt-2.5 text-center text-[11px] text-[#AAB6C5]">{label}</p>
    </div>
  );
}
