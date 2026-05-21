"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { terminalFadeUp } from "@/components/ui/terminal/motion";

export default function TerminalCard({
  children,
  className = "",
  glow = false,
  surface = false,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  /** Card claro sobre fundo light (landing) */
  surface?: boolean;
  padding?: "sm" | "md" | "lg";
}) {
  const pad = padding === "lg" ? "p-6 sm:p-8" : padding === "sm" ? "p-3" : "p-4 sm:p-5";
  const base = surface ? "t-card-surface" : "t-card";
  const accent = glow ? (surface ? "t-card-surface--accent" : "t-card--glow") : "";
  return (
    <motion.div
      variants={terminalFadeUp}
      initial="hidden"
      animate="show"
      className={`${base} ${accent} ${pad} ${className}`}
    >
      {children}
    </motion.div>
  );
}
