"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { rankHotMatches, momentClass } from "@/lib/ux/operationalIntelligence";
import { opsListItem, opsListStagger } from "@/components/ui/terminal/motion";
import { TERMINAL_COPY } from "@/lib/ux/sportsLanguage";

function heatMoment(heat: number): "calm" | "warm" | "hot" | "ignite" {
  if (heat >= 85) return "ignite";
  if (heat >= 65) return "hot";
  if (heat >= 42) return "warm";
  return "calm";
}

function HeatRankingInner({ matches }: { matches: EnrichedLiveMatch[] }) {
  const ranked = useMemo(() => rankHotMatches(matches, 6), [matches]);

  return (
    <aside className="gp-op-heat" aria-label="Jogos mais quentes">
      <header className="gp-op-heat__head">
        <Flame className="h-4 w-4 text-[var(--gp-red)]" aria-hidden />
        <div>
          <p className="gp-type-title gp-op-heat__title">{TERMINAL_COPY.heatTitle}</p>
          <p className="gp-type-caption gp-op-heat__sub">{TERMINAL_COPY.heatSub}</p>
        </div>
      </header>

      {ranked.length === 0 ? (
        <p className="gp-op-heat__empty">Nenhum jogo ao vivo com calor operacional agora.</p>
      ) : (
        <motion.ol
          variants={opsListStagger}
          initial="hidden"
          animate="show"
          className="gp-op-heat__list"
        >
          {ranked.map((entry, i) => {
            const m = entry.match;
            const level = heatMoment(entry.heat);
            return (
              <motion.li
                key={m.fixtureId}
                variants={opsListItem}
                className={`gp-op-heat__item ${momentClass(level)}`}
              >
                <span className="gp-op-heat__rank tabular-nums">{i + 1}</span>
                <div className="gp-op-heat__body">
                  <Link
                    href={`/match/${encodeURIComponent(m.fixtureId)}`}
                    className="gp-op-heat__match-link"
                  >
                    <span className="gp-type-body gp-op-heat__teams">
                      {m.homeTeam} x {m.awayTeam}
                    </span>
                    <span className="gp-type-metric gp-op-heat__heat tabular-nums">{entry.heat}</span>
                  </Link>
                  <p className="gp-type-caption gp-op-heat__narrative">{entry.narrative}</p>
                  {entry.tags.length > 0 && (
                    <div className="gp-op-heat__tags">
                      {entry.tags.map((t) => (
                        <span key={t} className="gp-op-heat__tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.li>
            );
          })}
        </motion.ol>
      )}
    </aside>
  );
}

export default memo(HeatRankingInner);
