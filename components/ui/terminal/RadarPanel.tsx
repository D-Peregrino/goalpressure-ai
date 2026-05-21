"use client";

import { motion } from "framer-motion";

export default function RadarPanel({
  value,
  label = "Live Edge Radar",
  sublabel,
}: {
  value: number;
  label?: string;
  sublabel?: string;
}) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div className="flex flex-col items-center py-2">
      {label ? <p className="t-label mb-4 w-full text-center">{label}</p> : null}
      <div className="relative flex h-44 w-44 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-white/[0.08]" />
        <div className="absolute inset-8 rounded-full border border-white/[0.05]" />
        <div className="absolute inset-16 rounded-full border border-[#FF2B2B]/15" />
        <motion.div
          className="absolute left-1/2 top-1/2 h-0.5 w-[42%] origin-left rounded-full bg-gradient-to-r from-[#FF2B2B]/80 to-transparent"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        />
        <div className="relative z-10 text-center">
          <p className="font-display text-4xl font-bold tabular-nums t-accent">{Math.round(v)}</p>
          {sublabel && (
            <p className="mt-1 font-mono-data text-[var(--text-muted-on-dark)]">{sublabel}</p>
          )}
        </div>
      </div>
    </div>
  );
}
