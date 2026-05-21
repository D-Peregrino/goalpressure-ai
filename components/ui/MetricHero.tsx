"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function MetricHero({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      className={`gp-metric-hero ${accent ? "gp-metric-hero--accent" : ""}`}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="gp-label">{label}</p>
        {icon}
      </div>
      <p className="gp-metric-value mt-3">{value}</p>
      {sub && <p className="gp-metric-sub mt-2">{sub}</p>}
    </motion.div>
  );
}
