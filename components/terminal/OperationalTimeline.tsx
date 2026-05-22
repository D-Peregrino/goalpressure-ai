"use client";

import Link from "next/link";
import { memo, useMemo } from "react";
import { Clock } from "lucide-react";
import { motion } from "framer-motion";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { buildOperationalTimeline } from "@/lib/ux/operationalIntelligence";
import { opsListItem, opsListStagger } from "@/components/ui/terminal/motion";
import { TERMINAL_COPY } from "@/lib/ux/sportsLanguage";

const KIND_ICON: Record<string, string> = {
  goal: "⚽",
  steam: "📉",
  pressure: "🔥",
  chaos: "⚡",
  execute: "◎",
  odds: "📊",
  micro: "◆",
  sequence: "↻",
};

function OperationalTimelineInner({ matches }: { matches: EnrichedLiveMatch[] }) {
  const events = useMemo(() => buildOperationalTimeline(matches, 12), [matches]);

  return (
    <aside className="gp-op-timeline" aria-label="Linha do tempo operacional">
      <header className="gp-op-timeline__head">
        <Clock className="h-4 w-4" aria-hidden />
        <div>
          <p className="gp-type-title gp-op-timeline__title">{TERMINAL_COPY.timelineTitle}</p>
          <p className="gp-type-caption gp-op-timeline__sub">{TERMINAL_COPY.timelineSub}</p>
        </div>
      </header>

      {events.length === 0 ? (
        <p className="gp-op-timeline__empty">
          Eventos aparecem quando pressão, odds ou ritmo mudam nos jogos ao vivo.
        </p>
      ) : (
        <motion.ul
          variants={opsListStagger}
          initial="hidden"
          animate="show"
          className="gp-op-timeline__list"
        >
          {events.map((ev) => (
            <motion.li
              key={`${ev.fixtureId}-${ev.id}`}
              variants={opsListItem}
              className={`gp-op-timeline__item gp-op-timeline__item--${ev.kind}`}
            >
              <span className="gp-op-timeline__icon" aria-hidden>
                {KIND_ICON[ev.kind] ?? "•"}
              </span>
              <div className="gp-op-timeline__content">
                <Link
                  href={`/match/${encodeURIComponent(ev.fixtureId)}`}
                  className="gp-op-timeline__match"
                >
                  {ev.matchLabel}
                </Link>
                <p className="gp-op-timeline__label">{ev.label}</p>
                {ev.detail && (
                  <p className="gp-op-timeline__detail">{ev.detail}</p>
                )}
                <span className="gp-op-timeline__meta">
                  {ev.minute}&apos; · {ev.league}
                </span>
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </aside>
  );
}

export default memo(OperationalTimelineInner);
