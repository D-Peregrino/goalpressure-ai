"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import type { StoryChapter } from "@/lib/match/matchStoryVisual";
import type { QuantTimelineEvent } from "@/lib/match/buildQuantTimeline";
import EmotionalTimeline from "@/components/match-center/EmotionalTimeline";

const CHAPTER_STYLE: Record<
  StoryChapter["kind"],
  { color: string; icon: string }
> = {
  open: { color: "#fbbf24", icon: "◎" },
  market: { color: "#4ade80", icon: "◇" },
  pressure: { color: "#ff2b2b", icon: "▲" },
  control: { color: "#94a3b8", icon: "▼" },
  emotion: { color: "#f472b6", icon: "!" },
};

function StoryTimelineInner({
  chapters,
  events,
  currentMinute,
}: {
  chapters: StoryChapter[];
  events: QuantTimelineEvent[];
  currentMinute: number;
}) {
  return (
    <div className="gp-story-timeline-wrap">
      {chapters.length > 0 && (
        <section className="gp-story-chapters">
          <h3 className="gp-story-chapters__title">História do jogo</h3>
          <div className="gp-story-chapters__track">
            {chapters.map((ch, i) => {
              const style = CHAPTER_STYLE[ch.kind];
              return (
                <motion.article
                  key={ch.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="gp-story-chapters__card"
                  style={{ borderColor: style.color }}
                >
                  <span
                    className="gp-story-chapters__icon"
                    style={{ color: style.color }}
                  >
                    {style.icon}
                  </span>
                  <div>
                    <span className="gp-story-chapters__min">{ch.minute}&apos;</span>
                    <p className="gp-story-chapters__head">{ch.title}</p>
                    <p className="gp-story-chapters__detail">{ch.detail}</p>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>
      )}
      <EmotionalTimeline events={events} currentMinute={currentMinute} />
    </div>
  );
}

export default memo(StoryTimelineInner);
