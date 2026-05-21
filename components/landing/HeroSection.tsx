"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { BRAND } from "@/lib/design/brand";
import { TerminalMock } from "@/components/ui/terminal";
import { terminalFadeUp, terminalStagger } from "@/components/ui/terminal/motion";

export default function HeroSection() {
  return (
    <section className="gp-landing-hero">
      <motion.div
        variants={terminalStagger}
        initial="hidden"
        animate="show"
        className="gp-landing-hero__grid"
      >
        <motion.div variants={terminalFadeUp} className="gp-landing-hero__copy">
          <p className="gp-landing-eyebrow">{BRAND.domain}</p>
          <h1 className="gp-landing-hero__title">{BRAND.tagline}</h1>
          <p className="gp-landing-hero__subtitle">{BRAND.subtitle}</p>
          <div className="gp-landing-hero__cta">
            <Link href="/terminal" className="gp-btn gp-btn--primary">
              Entrar no Terminal
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/terminal" className="gp-btn gp-btn--secondary">
              Ver demonstração live
            </Link>
          </div>
        </motion.div>
        <motion.div variants={terminalFadeUp} className="gp-landing-hero__preview">
          <TerminalMock />
        </motion.div>
      </motion.div>
    </section>
  );
}
