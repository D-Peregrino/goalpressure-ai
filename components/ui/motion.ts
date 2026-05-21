"use client";

import type { Variants } from "framer-motion";

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.04 },
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
  },
};

export const glowPulse = {
  animate: {
    boxShadow: [
      "0 0 20px rgba(255, 43, 43, 0.08)",
      "0 0 32px rgba(255, 43, 43, 0.18)",
      "0 0 20px rgba(255, 43, 43, 0.08)",
    ],
  },
  transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
};
