"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import InteractiveTerminalDemo from "@/components/landing/premium/InteractiveTerminalDemo";
import AnimatedCounter from "@/components/landing/premium/AnimatedCounter";

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export default function PremiumHero() {
  return (
    <section className="gpl-hero gpl-hero--cinema">
      <div className="gpl-wrap gpl-hero__grid">
        <motion.div variants={stagger} initial="hidden" animate="show">
          <motion.p className="gpl-eyebrow" variants={item}>
            <span className="gpl-eyebrow__dot" aria-hidden />
            Inteligência esportiva ao vivo
          </motion.p>
          <motion.h1 className="gpl-hero__title" variants={item}>
            Pressão ao vivo.
            <br />
            <span className="gpl-hero__title-accent">Decisão em segundos.</span>
          </motion.h1>
          <motion.p className="gpl-hero__pitch" variants={item}>
            <strong>Em 5 segundos:</strong> o GoalPressure traduz o que acontece em campo e no
            mercado em leitura institucional — para você priorizar o confronto certo, no momento
            certo.
          </motion.p>
          <motion.div className="gpl-hero__cta" variants={item}>
            <Link href="/cadastro" className="gpl-btn gpl-btn--primary gpl-btn--lg gpl-btn--shine">
              Começar grátis
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/terminal" className="gpl-btn gpl-btn--secondary gpl-btn--lg">
              Ver central ao vivo
            </Link>
          </motion.div>
          <motion.div className="gpl-hero__trust" variants={item}>
            <div className="gpl-hero__trust-item">
              <strong>
                <AnimatedCounter value={6} suffix="+" />
              </strong>
              jogos no gratuito
            </div>
            <div className="gpl-hero__trust-item">
              <strong>
                <AnimatedCounter value={78} />
              </strong>
              GPI em destaque
            </div>
            <div className="gpl-hero__trust-item">
              <strong>24/7</strong>
              leitura ao vivo
            </div>
          </motion.div>
        </motion.div>
        <div className="gpl-hero__visual">
          <InteractiveTerminalDemo autoRotate />
        </div>
      </div>
    </section>
  );
}
