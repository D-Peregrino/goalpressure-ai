"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export default function MetricTile({
  label,
  value,
  sub,
  accent,
  icon,
  large,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  icon?: ReactNode;
  large?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`t-metric min-w-0 ${accent ? "t-metric--accent" : ""} ${large ? "t-metric--lg" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="t-label">{label}</p>
        {icon}
      </div>
      <p className="t-metric-value">{value}</p>
      {sub && <p className="t-metric-sub">{sub}</p>}
    </motion.div>
  );
}
