"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import DemoCrest from "@/components/landing/premium/DemoCrest";
import { DEMO_HERO_MATCH, DEMO_MATCHES } from "@/lib/landing/demoFixtures";

const SLIDES = [
  {
    type: "match" as const,
    home: DEMO_HERO_MATCH.home,
    away: DEMO_HERO_MATCH.away,
    line1: `${DEMO_HERO_MATCH.minute}' · GPI ${DEMO_HERO_MATCH.gpi}`,
    line2: DEMO_HERO_MATCH.narrative,
  },
  {
    type: "alert" as const,
    title: "Zona de atenção",
    body: "Ritmo acelerou nos últimos 8 min. Mercado em movimento.",
  },
  {
    type: "match" as const,
    home: DEMO_MATCHES[1]!.home,
    away: DEMO_MATCHES[1]!.away,
    line1: `${DEMO_MATCHES[1]!.scoreHome}–${DEMO_MATCHES[1]!.scoreAway} · GPI ${DEMO_MATCHES[1]!.gpi}`,
    line2: DEMO_MATCHES[1]!.narrative,
  },
];

export default function TelegramMockPremium() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 4200);
    return () => window.clearInterval(t);
  }, []);

  const slide = SLIDES[index]!;

  return (
    <motion.div
      className="gpl-phone gpl-phone--premium gpl-float-layer"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="gpl-phone__bezel" aria-hidden />
      <div className="gpl-phone__screen">
        <div className="gpl-phone__header">
          <span className="gpl-phone__avatar" aria-hidden>
            GP
          </span>
          <div>
            <span className="gpl-phone__name">GoalPressure Alertas</span>
            <span className="gpl-phone__status">online</span>
          </div>
        </div>
        <div className="gpl-phone__chat">
          <AnimatePresence mode="wait">
            {slide.type === "match" ? (
              <motion.div
                key={`m-${index}`}
                className="gpl-bubble gpl-bubble--in gpl-bubble--rich"
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <div className="gpl-bubble__teams">
                  <DemoCrest logoPath={slide.home.logoPath} teamName={slide.home.name} size={22} />
                  <span className="gpl-bubble__vs">×</span>
                  <DemoCrest logoPath={slide.away.logoPath} teamName={slide.away.name} size={22} />
                </div>
                <strong>
                  {slide.home.name} × {slide.away.name}
                </strong>
                <p>{slide.line1}</p>
                <p className="gpl-bubble__muted">{slide.line2}</p>
              </motion.div>
            ) : (
              <motion.div
                key={`a-${index}`}
                className="gpl-bubble gpl-bubble--alert"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
              >
                <span className="gpl-bubble__alert-tag">Atenção operacional</span>
                <strong>{slide.title}</strong>
                <p>{slide.body}</p>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="gpl-phone__typing" aria-hidden>
            <span />
            <span />
            <span />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
