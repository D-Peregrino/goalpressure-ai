"use client";

import { motion } from "framer-motion";

export default function EdgeMeter({
  value,
  label,
  max = 100,
}: {
  value: number;
  label: string;
  max?: number;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between font-mono-data">
        <span className="text-[var(--text-muted-on-dark)]">{label}</span>
        <span className="tabular-nums font-medium">{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <motion.div
          className="h-full rounded-full bg-[#FF2B2B]/75"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
