"use client";

import { motion } from "framer-motion";
import { terminalFadeUp } from "@/components/ui/terminal/motion";

export default function TerminalKpiStrip({
  tracked,
  live,
  signals,
  avgEdge,
  confidence,
  execute,
}: {
  tracked: number;
  live: number;
  signals: number;
  avgEdge: number;
  confidence: number;
  execute: number;
}) {
  const items = [
    { label: "Rastreadas", value: String(tracked) },
    { label: "Ao vivo", value: String(live), live: true },
    { label: "Sinais", value: String(signals) },
    { label: "Edge médio", value: `${avgEdge.toFixed(1)}%` },
    { label: "Confiança", value: String(Math.round(confidence)) },
    { label: "EXECUTE", value: String(execute), accent: true },
  ];

  return (
    <motion.div variants={terminalFadeUp} className="gp-kpi-strip">
      {items.map((item) => (
        <div
          key={item.label}
          className={`gp-kpi-tile ${item.live ? "gp-kpi-tile--live" : ""} ${item.accent ? "gp-kpi-tile--accent" : ""}`}
        >
          <p className="gp-kpi-tile__label">{item.label}</p>
          <p className="gp-kpi-tile__value">{item.value}</p>
        </div>
      ))}
    </motion.div>
  );
}
