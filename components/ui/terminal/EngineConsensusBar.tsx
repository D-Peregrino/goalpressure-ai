"use client";

import { motion } from "framer-motion";

export default function EngineConsensusBar({
  engines,
}: {
  engines: { engine: string; weight: number }[];
}) {
  if (engines.length === 0) {
    return (
      <p className="font-mono-data text-[var(--text-muted-on-dark)]">Awaiting live data</p>
    );
  }
  const max = Math.max(...engines.map((e) => e.weight), 1);
  return (
    <div className="space-y-3">
      {engines.slice(0, 6).map((e) => (
        <div key={e.engine}>
          <div className="mb-1 flex justify-between font-mono-data">
            <span className="truncate pr-2 text-[var(--text-muted-on-dark)]">{e.engine}</span>
            <span className="font-medium">{Math.round(e.weight)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <motion.div
              className="h-full rounded-full bg-[#FF2B2B]/60"
              initial={{ width: 0 }}
              animate={{ width: `${(e.weight / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
