"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TABS = [
  { id: "overview", label: "Jogo" },
  { id: "timeline", label: "Timeline" },
  { id: "radar", label: "Radar" },
  { id: "engines", label: "Leituras" },
  { id: "execute", label: "Oportunidade" },
  { id: "odds", label: "Odds" },
] as const;

export type MatchCenterTab = (typeof TABS)[number]["id"];

function MatchCenterMobileShellInner({
  activeTab,
  onTab,
  panels,
}: {
  activeTab: MatchCenterTab;
  onTab: (tab: MatchCenterTab) => void;
  panels: Record<MatchCenterTab, React.ReactNode>;
}) {
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const onTouchEnd = (endX: number) => {
    if (touchStart == null) return;
    const dx = endX - touchStart;
    const idx = TABS.findIndex((t) => t.id === activeTab);
    if (dx < -50 && idx < TABS.length - 1) onTab(TABS[idx + 1].id);
    if (dx > 50 && idx > 0) onTab(TABS[idx - 1].id);
    setTouchStart(null);
  };

  return (
    <div className="gp-mc-mobile lg:hidden">
      <nav className="gp-mc-mobile__tabs" aria-label="Match center sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`gp-mc-mobile__tab ${activeTab === t.id ? "gp-mc-mobile__tab--active" : ""}`}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div
        className="gp-mc-mobile__content"
        onTouchStart={(e) => setTouchStart(e.touches[0]?.clientX ?? null)}
        onTouchEnd={(e) => onTouchEnd(e.changedTouches[0]?.clientX ?? 0)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            {panels[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>

      <nav className="gp-mc-mobile__bottom">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={activeTab === t.id ? "gp-mc-mobile__bottom--active" : ""}
            onClick={() => onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default memo(MatchCenterMobileShellInner);
