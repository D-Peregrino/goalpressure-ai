"use client";

import { motion } from "framer-motion";

export default function ExecutionBar({
  value,
  label,
  color = "#ff2b2b",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between font-mono text-[10px]">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-foreground">{Math.round(pct)}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 12px ${color}55`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
