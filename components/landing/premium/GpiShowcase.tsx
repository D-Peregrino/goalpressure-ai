"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { DEMO_HERO_MATCH } from "@/lib/landing/demoFixtures";
import MiniPressureChart from "@/components/landing/premium/MiniPressureChart";
import { AnimatedGpiValue } from "@/components/landing/premium/AnimatedCounter";
import ScrollReveal from "@/components/landing/premium/ScrollReveal";

export default function GpiShowcase() {
  const [gpi] = useState(DEMO_HERO_MATCH.gpi);

  return (
    <section id="gpi" className="gpl-section">
      <div className="gpl-wrap gpl-split gpl-split--reverse">
        <ScrollReveal>
          <motion.div
            className="gpl-gpi-panel gpl-gpi-panel--glass"
            whileHover={{ scale: 1.01 }}
            transition={{ duration: 0.3 }}
          >
            <p className="gpl-eyebrow">GoalPressure Index</p>
            <h2 className="gpl-section__title gpl-section__title--sm">
              O termômetro do confronto
            </h2>
            <div className="gpl-gpi-score">
              <AnimatedGpiValue value={gpi} className="gpl-gpi-score__value" />
              <span className="gpl-gpi-score__label">GPI · Alta pressão</span>
            </div>
            <MiniPressureChart data={DEMO_HERO_MATCH.pressureSeries} animateKey="gpi-showcase" />
            <div className="gpl-gpi-metrics">
              {[
                ["Pressão ofensiva", "Alta"],
                ["Ritmo", "Acelerando"],
                ["Mercado", "Em movimento"],
                ["Confiança", "Forte"],
              ].map(([label, val]) => (
                <div key={label} className="gpl-gpi-metric">
                  <span>{label}</span>
                  <strong>{val}</strong>
                </div>
              ))}
            </div>
          </motion.div>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div>
            <p className="gpl-eyebrow">Inteligência quantitativa</p>
            <h2 className="gpl-section__title">Um índice. Toda a história do momento.</h2>
            <p className="gpl-section__sub">
              O GPI sintetiza intensidade em campo, fase do jogo e sinais de mercado — com a
              sobriedade visual de uma mesa institucional, não de um painel experimental.
            </p>
            <p className="gpl-section__sub gpl-section__sub--tight">
              Curvas reais de pressão, atualizadas a cada onda de ataque. Quando o índice sobe, você
              sabe que o confronto entrou em zona de atenção.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
