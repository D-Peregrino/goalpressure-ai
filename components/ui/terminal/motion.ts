"use client";

import type { Variants } from "framer-motion";

export const terminalFadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

export const terminalStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};
