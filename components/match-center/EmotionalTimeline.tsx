"use client";

import { memo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Goal,
  TrendingDown,
  Flame,
  Zap,
  Target,
  CornerDownRight,
  CircleDot,
} from "lucide-react";
import type { QuantTimelineEvent } from "@/lib/match/buildQuantTimeline";

const KIND_META: Record<
  string,
  { color: string; Icon: typeof Goal; pulse?: boolean }
> = {
  goal: { color: "#fbbf24", Icon: Goal, pulse: true },
  card: { color: "#f87171", Icon: CircleDot },
  corner: { color: "#93c5fd", Icon: CornerDownRight },
  steam: { color: "#4ade80", Icon: TrendingDown, pulse: true },
  pressure: { color: "#ff6b6b", Icon: Flame, pulse: true },
  chaos: { color: "#c084fc", Icon: Zap },
  odds: { color: "#60a5fa", Icon: Target },
  execute: { color: "#22c55e", Icon: Zap, pulse: true },
  micro: { color: "#fb923c", Icon: Flame },
  sequence: { color: "#a78bfa", Icon: CircleDot },
  other: { color: "#94a3b8", Icon: CircleDot },
};

function EmotionalTimelineInner({
  events,
  currentMinute,
}: {
  events: QuantTimelineEvent[];
  currentMinute: number;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const latestId = events.length > 0 ? events[events.length - 1]?.id : null;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || events.length === 0) return;
    el.scrollLeft = el.scrollWidth;
  }, [events.length]);

  const maxMin = Math.max(currentMinute, 90, ...events.map((e) => e.minute), 1);

  return (
    <section className="gp-mc-panel gp-mc-timeline gp-mc-timeline--emotional">
      <header className="gp-mc-panel__head">
        <h2 className="gp-mc-panel__title">Linha do tempo ao vivo</h2>
        <span className="gp-mc-panel__meta tabular-nums">{events.length} momentos</span>
      </header>

      <div className="gp-mc-timeline__broadcast">
        <div className="gp-mc-timeline__track-wrap">
          <div className="gp-mc-timeline__axis" aria-hidden>
            <motion.div
              className="gp-mc-timeline__progress"
              animate={{ width: `${(currentMinute / maxMin) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
            <span
              className="gp-mc-timeline__needle gp-mc-timeline__needle--pulse"
              style={{ left: `${(currentMinute / maxMin) * 100}%` }}
            />
            <span className="gp-mc-timeline__now tabular-nums">{currentMinute}&apos;</span>
          </div>

          <div ref={scrollRef} className="gp-mc-timeline__scroll">
            {events.length === 0 ? (
              <p className="gp-mc-timeline__empty">
                A transmissão começa assim que o jogo gerar movimentos…
              </p>
            ) : (
              events.map((ev, i) => {
                const meta = KIND_META[ev.kind] ?? KIND_META.other;
                const Icon = meta.Icon;
                const isLatest = ev.id === latestId;
                return (
                  <motion.article
                    key={ev.id}
                    initial={{ opacity: 0, scale: 0.92, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3 }}
                    className={`gp-mc-timeline__card ${isLatest ? "gp-mc-timeline__card--latest" : ""}`}
                    style={{
                      borderColor: meta.color,
                      boxShadow: isLatest ? `0 0 24px ${meta.color}33` : undefined,
                    }}
                  >
                    <span
                      className="gp-mc-timeline__icon-wrap"
                      style={{ background: `${meta.color}22`, color: meta.color }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    <span className="gp-mc-timeline__min tabular-nums">{ev.minute}&apos;</span>
                    <span className="gp-mc-timeline__label">{ev.label}</span>
                    {ev.detail && (
                      <span className="gp-mc-timeline__detail">{ev.detail}</span>
                    )}
                    {meta.pulse && isLatest && (
                      <span className="gp-mc-timeline__pulse-tag">agora</span>
                    )}
                  </motion.article>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default memo(EmotionalTimelineInner);
