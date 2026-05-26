"use client";

import { motion } from "framer-motion";

export default function LandingAmbient() {
  return (
    <div className="gpl-ambient-layer" aria-hidden>
      <div className="gpl__ambient" />
      <div className="gpl__grid-noise" />
      <motion.div
        className="gpl-orb gpl-orb--1"
        animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.08, 0.95, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="gpl-orb gpl-orb--2"
        animate={{ x: [0, -50, 30, 0], y: [0, 40, -25, 0], scale: [1, 0.92, 1.06, 1] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="gpl-orb gpl-orb--3"
        animate={{ x: [0, 25, -35, 0], y: [0, 50, 10, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="gpl-vignette" />
      <div className="gpl-hero-beam" />
    </div>
  );
}
