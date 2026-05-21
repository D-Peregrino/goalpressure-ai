"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { scaleIn } from "@/components/ui/motion";

export interface PremiumCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
  size?: "md" | "lg" | "xl";
  delay?: number;
}

const sizeClasses = {
  md: "p-4",
  lg: "p-5 sm:p-6",
  xl: "p-6 sm:p-8",
};

export default function PremiumCard({
  children,
  className = "",
  glow = false,
  size = "md",
  delay = 0,
}: PremiumCardProps) {
  return (
    <motion.article
      variants={scaleIn}
      initial="hidden"
      animate="show"
      transition={{ delay }}
      className={`gp-card corner-brackets ${sizeClasses[size]} ${
        glow ? "gp-glow" : ""
      } ${className}`}
    >
      {children}
    </motion.article>
  );
}
