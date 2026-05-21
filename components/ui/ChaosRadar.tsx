"use client";

import { motion } from "framer-motion";

export default function ChaosRadar({
  level,
  label = "Chaos Index",
}: {
  level: number;
  label?: string;
}) {
  const clamped = Math.min(100, Math.max(0, level));

  return (
    <div className="relative mx-auto flex h-44 w-44 items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-white/5 bg-white/[0.02]" />
      <div className="absolute inset-4 rounded-full border border-white/5" />
      <div className="absolute inset-8 rounded-full border border-pressure/20" />
      <motion.div
        className="absolute left-1/2 top-1/2 h-1 w-[42%] origin-left rounded-full bg-gradient-to-r from-pressure/80 to-transparent"
        style={{ marginTop: -2 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative z-10 text-center">
        <p className="font-mono text-3xl font-bold tabular-nums text-pressure">
          {Math.round(clamped)}
        </p>
        <p className="gp-label mt-1">{label}</p>
      </div>
      <motion.div
        className="pointer-events-none absolute inset-0 rounded-full"
        animate={{
          boxShadow: [
            `0 0 30px rgba(255,43,43,${clamped / 400})`,
            `0 0 50px rgba(255,43,43,${clamped / 250})`,
            `0 0 30px rgba(255,43,43,${clamped / 400})`,
          ],
        }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </div>
  );
}
