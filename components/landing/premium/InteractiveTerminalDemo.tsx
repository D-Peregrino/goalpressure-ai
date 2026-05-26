"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DEMO_MATCHES, type DemoMatch } from "@/lib/landing/demoFixtures";
import DemoCrest from "@/components/landing/premium/DemoCrest";
import MiniPressureChart from "@/components/landing/premium/MiniPressureChart";
import { AnimatedGpiValue } from "@/components/landing/premium/AnimatedCounter";

const ROTATE_MS = 9000;

export default function InteractiveTerminalDemo({
  className = "",
  autoRotate = true,
}: {
  className?: string;
  autoRotate?: boolean;
}) {
  const [activeId, setActiveId] = useState(DEMO_MATCHES[0]!.id);
  const match = DEMO_MATCHES.find((m) => m.id === activeId) ?? DEMO_MATCHES[0]!;

  const select = useCallback((id: string) => setActiveId(id), []);

  useEffect(() => {
    if (!autoRotate) return;
    const id = window.setInterval(() => {
      setActiveId((prev) => {
        const idx = DEMO_MATCHES.findIndex((m) => m.id === prev);
        const next = DEMO_MATCHES[(idx + 1) % DEMO_MATCHES.length]!;
        return next.id;
      });
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [autoRotate]);

  return (
    <motion.div
      className={`gpl-mock gpl-mock--interactive gpl-float-layer ${className}`.trim()}
      initial={{ opacity: 0, y: 28, rotateX: 4 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
    >
      <div className="gpl-mock__glow-ring" aria-hidden />
      <div className="gpl-mock__chrome">
        <div className="gpl-mock__dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <span className="gpl-mock__title">Central ao vivo</span>
        <button
          type="button"
          className="gpl-mock__live gpl-mock__live--btn"
          onClick={() => select(DEMO_MATCHES[0]!.id)}
        >
          <span className="gpl-mock__live-dot" aria-hidden />
          Ao vivo · demo
        </button>
      </div>
      <div className="gpl-mock__body">
        <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={match.id}
              className="gpl-mock__hero-card"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.35 }}
            >
              <HeroFaceoff match={match} />
              <p className="gpl-mock__minute">
                {match.minute}&apos; · {match.narrative}
              </p>
              <GpiBar match={match} />
            </motion.div>
          </AnimatePresence>
          <MiniPressureChart data={match.pressureSeries} animateKey={match.id} />
        </div>
        <div className="gpl-mock__list" role="tablist" aria-label="Partidas na demo">
          {DEMO_MATCHES.map((m) => {
            const active = m.id === activeId;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`gpl-mock__list-item${active ? " gpl-mock__list-item--active" : ""}${m.heat >= 75 ? " gpl-mock__list-item--hot" : ""}`}
                onClick={() => select(m.id)}
              >
                <span className="gpl-mock__list-face">
                  <DemoCrest logoPath={m.home.logoPath} teamName={m.home.name} size={20} />
                  <span className="gpl-mock__list-names">
                    {m.home.short} × {m.away.short}
                  </span>
                  <DemoCrest logoPath={m.away.logoPath} teamName={m.away.name} size={20} />
                </span>
                <span className="gpl-mock__list-meta">
                  {m.scoreHome}–{m.scoreAway} · <span className="gpl-mock__heat">{m.heat}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <p className="gpl-mock__hint">Clique num jogo para explorar · dados ilustrativos</p>
    </motion.div>
  );
}

function HeroFaceoff({ match }: { match: DemoMatch }) {
  return (
    <div className="gpl-mock__match-row">
      <div className="gpl-mock__team">
        <DemoCrest logoPath={match.home.logoPath} teamName={match.home.name} size={32} />
        <span>{match.home.name}</span>
      </div>
      <span className="gpl-mock__score">
        {match.scoreHome} – {match.scoreAway}
      </span>
      <div className="gpl-mock__team gpl-mock__team--away">
        <span>{match.away.name}</span>
        <DemoCrest logoPath={match.away.logoPath} teamName={match.away.name} size={32} />
      </div>
    </div>
  );
}

function GpiBar({ match }: { match: DemoMatch }) {
  return (
    <div className="gpl-mock__gpi">
      <div className="gpl-mock__gpi-label">
        <span>GoalPressure Index</span>
        <AnimatedGpiValue key={match.id} value={match.gpi} className="gpl-mock__gpi-num" />
      </div>
      <div className="gpl-mock__gpi-bar">
        <motion.div
          className="gpl-mock__gpi-fill"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: match.gpi / 100 }}
          style={{ transformOrigin: "left center" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}
