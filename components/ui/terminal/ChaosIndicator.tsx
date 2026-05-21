"use client";

import { motion } from "framer-motion";

export default function ChaosIndicator({ level }: { level: number }) {
  const v = Math.min(100, Math.max(0, level));
  const bars = 12;
  return (
    <div>
      <div className="mb-3 flex justify-between">
        <span className="t-label">Chaos Map</span>
        <span className="font-mono-data tabular-nums t-accent font-medium">{Math.round(v)}</span>
      </div>
      <div className="flex h-16 items-end gap-1">
        {Array.from({ length: bars }, (_, i) => {
          const h = 20 + ((i * 7 + v) % 80);
          return (
            <motion.div
              key={i}
              className="flex-1 rounded-t-sm bg-[#FF2B2B]/45"
              initial={{ height: 0 }}
              animate={{ height: `${h}%` }}
              transition={{ delay: i * 0.03, duration: 0.4 }}
            />
          );
        })}
      </div>
    </div>
  );
}
