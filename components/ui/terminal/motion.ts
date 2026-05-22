"use client";

import type { Transition, Variants } from "framer-motion";

/** Curva premium — lenta, sem snap */
export const FLOW_EASE = [0.22, 1, 0.36, 1] as const;

export const flowTransition: Transition = {
  duration: 0.48,
  ease: FLOW_EASE,
};

export const layoutTransition: Transition = {
  layout: { duration: 0.42, ease: FLOW_EASE },
};

export const terminalFadeUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: FLOW_EASE },
  },
};

export const terminalStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

/** Entrada da central — ritmo premium (Apple-level) */
export const polishStagger: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.06 },
  },
};

export const polishFade: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.52, ease: FLOW_EASE },
  },
};

/** Hero — troca suave entre jogos */
export const heroSwap: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: FLOW_EASE },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.38, ease: FLOW_EASE },
  },
};

export const heroReveal = heroSwap;

/** Alertas — entrada lateral suave */
export const alertSlide: Variants = {
  hidden: { opacity: 0, x: 10, scale: 0.99 },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: { duration: 0.42, ease: FLOW_EASE },
  },
  exit: {
    opacity: 0,
    x: -6,
    transition: { duration: 0.32, ease: FLOW_EASE },
  },
};

export const opsListStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
};

export const opsListItem: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.38, ease: FLOW_EASE } },
};

/** Card na grade */
export const cardFlow: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: FLOW_EASE },
  },
};

/** Drawer — expansão */
export const drawerExpand: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.38, ease: FLOW_EASE },
  },
  open: {
    height: "auto",
    opacity: 1,
    transition: { duration: 0.45, ease: FLOW_EASE },
  },
};
