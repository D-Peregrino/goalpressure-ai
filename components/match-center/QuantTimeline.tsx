"use client";

import { memo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import type { QuantTimelineEvent } from "@/lib/match/buildQuantTimeline";

const KIND_COLOR: Record<string, string> = {
  goal: "#fbbf24",
  card: "#f87171",
  corner: "#93c5fd",
  steam: "#4ade80",
  pressure: "#ff6b6b",
  chaos: "#c084fc",
  odds: "#60a5fa",
  execute: "#22c55e",
  micro: "#fb923c",
  sequence: "#a78bfa",
  other: "#94a3b8",
};

function QuantTimelineInner({
  events,
  currentMinute,
}: {
  events: QuantTimelineEvent[];
  currentMinute: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || events.length === 0) return;
    el.scrollLeft = el.scrollWidth;
  }, [events.length]);

  const maxMin = Math.max(currentMinute, 90, ...events.map((e) => e.minute), 1);

  return (
    <section className="gp-mc-panel gp-mc-timeline">
      <header className="gp-mc-panel__head">
        <h2 className="gp-mc-panel__title">Linha do tempo ao vivo</h2>
        <span className="gp-mc-panel__meta tabular-nums">{events.length} momentos</span>
      </header>

      <div className="gp-mc-timeline__track-wrap">
        <div className="gp-mc-timeline__axis" aria-hidden>
          <div
            className="gp-mc-timeline__progress"
            style={{ width: `${(currentMinute / maxMin) * 100}%` }}
          />
          <span
            className="gp-mc-timeline__needle"
            style={{ left: `${(currentMinute / maxMin) * 100}%` }}
          />
        </div>
        <div ref={scrollRef} className="gp-mc-timeline__scroll">
          {events.length === 0 ? (
            <p className="gp-mc-timeline__empty">Aguardando movimentos do jogo…</p>
          ) : (
            events.map((ev, i) => (
              <motion.div
                key={ev.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="gp-mc-timeline__event"
                style={{ borderColor: KIND_COLOR[ev.kind] ?? KIND_COLOR.other }}
              >
                <span className="gp-mc-timeline__min tabular-nums">{ev.minute}&apos;</span>
                <span
                  className="gp-mc-timeline__dot"
                  style={{ background: KIND_COLOR[ev.kind] }}
                />
                <span className="gp-mc-timeline__label">{ev.label}</span>
                {ev.detail && (
                  <span className="gp-mc-timeline__detail">{ev.detail}</span>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(QuantTimelineInner);
