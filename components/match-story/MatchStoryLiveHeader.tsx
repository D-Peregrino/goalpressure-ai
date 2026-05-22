"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { MatchStoryVisualInput } from "@/lib/match/matchStoryVisual";
import {
  getTacticalVisualTheme,
  liveStoryHeadline,
  tacticalProfileClass,
} from "@/lib/match/matchStoryVisual";

function MatchStoryLiveHeaderInner({ input }: { input: MatchStoryVisualInput }) {
  const { title, subtitle } = liveStoryHeadline(input);
  const theme = getTacticalVisualTheme(input.tacticalProfile);

  return (
    <section
      className={`gp-story-header ${tacticalProfileClass(input.tacticalProfile)} gp-story-header--mood-${theme.mood}`}
    >
      <div className="gp-story-header__glow" aria-hidden />
      <p className="gp-story-header__kicker">O que o jogo está dizendo agora</p>
      <motion.h1
        key={title}
        className="gp-story-header__title"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {title}
      </motion.h1>
      <motion.p
        key={subtitle}
        className="gp-story-header__subtitle"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.4 }}
      >
        {subtitle}
      </motion.p>
      {input.confidence < 40 && (
        <span className="gp-story-header__warn">Leitura tática limitada</span>
      )}
    </section>
  );
}

export default memo(MatchStoryLiveHeaderInner);
