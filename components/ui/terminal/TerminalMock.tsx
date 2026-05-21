"use client";

import { motion } from "framer-motion";

/** Mock visual do terminal para hero da landing */
export default function TerminalMock() {
  return (
    <div className="t-card t-card--glow overflow-hidden p-0 shadow-xl">
      <div className="flex items-center gap-2 border-b border-white/[0.08] px-5 py-3.5">
        <span className="h-2 w-2 rounded-full bg-[#FF2B2B] t-live-pulse" />
        <span className="t-label">Live Command Center</span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-5">
        {["Pressure", "Edge", "Conf."].map((l, i) => (
          <div
            key={l}
            className="rounded-lg border border-white/[0.08] bg-white/[0.04] p-3 text-center"
          >
            <p className="t-label">{l}</p>
            <motion.p
              className="font-display text-xl font-bold t-accent mt-1.5"
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3 }}
            >
              {i === 0 ? "84" : i === 1 ? "+6.2%" : "72"}
            </motion.p>
          </div>
        ))}
      </div>
      <div className="space-y-2 px-5 pb-5 border-t border-white/[0.08] pt-4">
        {[
          { m: "Arsenal vs Chelsea", g: "EXECUTE" },
          { m: "Inter vs Milan", g: "PREPARE" },
        ].map((row) => (
          <div
            key={row.m}
            className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
          >
            <span className="font-mono-data text-[var(--text-on-dark)]">{row.m}</span>
            <span className="font-mono-data text-xs t-accent font-semibold">{row.g}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
