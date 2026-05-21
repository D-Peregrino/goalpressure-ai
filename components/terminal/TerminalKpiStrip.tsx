"use client";

import { motion } from "framer-motion";
import { TERMINAL_COPY } from "@/lib/ux/sportsLanguage";
import SportsTooltip from "@/components/ui/SportsTooltip";
import { TOOLTIPS } from "@/lib/ux/sportsLanguage";
import { terminalFadeUp } from "@/components/ui/terminal/motion";

export default function TerminalKpiStrip({
  tracked,
  live,
  upcoming,
  signals,
  execute,
}: {
  tracked: number;
  live: number;
  upcoming: number;
  signals: number;
  execute: number;
}) {
  const k = TERMINAL_COPY.kpi;
  const items = [
    { label: k.tracked, value: String(tracked) },
    { label: k.live, value: String(live), live: true },
    { label: k.upcoming, value: String(upcoming), upcoming: true },
    { label: k.signals, value: String(signals) },
    {
      label: k.execute,
      value: String(execute),
      accent: true,
      tip: TOOLTIPS.oportunidade,
    },
  ];

  return (
    <motion.div variants={terminalFadeUp} className="gp-kpi-strip gp-kpi-strip--sport gp-kpi-strip--premium">
      {items.map((item) => (
        <div
          key={item.label}
          className={`gp-kpi-tile ${item.live ? "gp-kpi-tile--live" : ""} ${item.upcoming ? "gp-kpi-tile--upcoming" : ""} ${item.accent ? "gp-kpi-tile--accent" : ""}`}
        >
          {item.tip ? (
            <SportsTooltip label={item.label} tip={item.tip} />
          ) : (
            <p className="gp-kpi-tile__label">{item.label}</p>
          )}
          <p className="gp-kpi-tile__value">{item.value}</p>
        </div>
      ))}
    </motion.div>
  );
}
