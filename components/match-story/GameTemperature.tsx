"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { MatchStoryVisualInput } from "@/lib/match/matchStoryVisual";
import {
  gameTemperatureFeels,
  getTacticalVisualTheme,
  tacticalProfileClass,
} from "@/lib/match/matchStoryVisual";

function GameTemperatureInner({ input }: { input: MatchStoryVisualInput }) {
  const feels = gameTemperatureFeels(input);
  const theme = getTacticalVisualTheme(input.tacticalProfile);
  const auraHeat = Math.max(
    input.emotionalTemperature,
    input.tacticalIntensity,
    input.momentum
  );

  return (
    <section
      className={`gp-game-temp ${tacticalProfileClass(input.tacticalProfile)} gp-game-temp--mood-${theme.mood}`}
    >
      <div
        className="gp-game-temp__aura"
        style={{ opacity: 0.35 + auraHeat / 220 }}
        aria-hidden
      />
      <header className="gp-game-temp__head">
        <h2 className="gp-game-temp__title">Temperatura do jogo</h2>
        <span className="gp-game-temp__profile">{input.tacticalProfile.replace(/_/g, " ")}</span>
      </header>
      <div className="gp-game-temp__grid">
        {feels.map((f) => (
          <div key={f.key} className={`gp-game-temp__cell gp-game-temp__cell--${f.key}`}>
            <span className="gp-game-temp__label">{f.label}</span>
            <div className="gp-game-temp__meter">
              <motion.span
                className="gp-game-temp__fill"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: f.level / 100 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <strong className="gp-game-temp__feel">{f.feel}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

export default memo(GameTemperatureInner);
