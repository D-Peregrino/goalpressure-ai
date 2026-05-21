"use client";

import { memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";
import type { MatchStoryLine } from "@/lib/match/matchStorytelling";

const TONE_CLASS: Record<MatchStoryLine["tone"], string> = {
  hot: "gp-mc-story__line--hot",
  opportunity: "gp-mc-story__line--opp",
  market: "gp-mc-story__line--market",
  calm: "gp-mc-story__line--calm",
  neutral: "gp-mc-story__line--neutral",
};

function MatchStoryBlockInner({
  primary,
  lines,
}: {
  primary: MatchStoryLine;
  lines: MatchStoryLine[];
}) {
  const secondary = lines.filter((l) => l.id !== primary.id).slice(0, 2);

  return (
    <section className="gp-mc-story" aria-labelledby="mc-story-title">
      <header className="gp-mc-story__head">
        <Radio className="gp-mc-story__icon h-4 w-4" aria-hidden />
        <h2 id="mc-story-title" className="gp-mc-story__title">
          O que está acontecendo agora
        </h2>
        <span className="gp-mc-story__live">
          <span className="gp-mc-story__live-dot" />
          AO VIVO
        </span>
      </header>

      <AnimatePresence mode="wait">
        <motion.p
          key={primary.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
          className={`gp-mc-story__primary ${TONE_CLASS[primary.tone]}`}
        >
          {primary.text}
        </motion.p>
      </AnimatePresence>

      {secondary.length > 0 && (
        <ul className="gp-mc-story__list">
          {secondary.map((line) => (
            <li key={line.id} className={`gp-mc-story__line ${TONE_CLASS[line.tone]}`}>
              {line.text}
            </li>
          ))}
        </ul>
      )}

      <p className="gp-mc-story__tip">
        Leitura gerada em tempo real a partir de intensidade, ritmo, pressão do jogo e
        movimento das odds.
      </p>
    </section>
  );
}

export default memo(MatchStoryBlockInner);
