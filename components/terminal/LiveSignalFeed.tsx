"use client";

import { memo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";
import type { LiveSignalEntry } from "@/lib/signals/liveSignalBuilder";
import { formatSignalTime } from "@/lib/signals/liveSignalBuilder";
import { SINAL_TIPO, TERMINAL_COPY, TOOLTIPS } from "@/lib/ux/sportsLanguage";
import SportsTooltip from "@/components/ui/SportsTooltip";

function SignalRow({ entry }: { entry: LiveSignalEntry }) {
  const prev =
    entry.previousOdd != null && entry.previousOdd >= 1.01
      ? entry.previousOdd.toFixed(2)
      : "—";
  const curr = entry.currentOdd >= 1.01 ? entry.currentOdd.toFixed(2) : "—";
  const edgeSign = entry.edgePercent >= 0 ? "+" : "";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      className={`gp-signal-feed__row gp-signal-feed__row--sport gp-signal-feed__row--${entry.type.toLowerCase().replace(/_/g, "-")}`}
    >
      <time className="gp-signal-feed__time">{formatSignalTime(entry.timestamp)}</time>
      <p className="gp-signal-feed__type">{SINAL_TIPO[entry.type]}</p>
      <p className="gp-signal-feed__match">{entry.matchLabel}</p>
      <p className="gp-signal-feed__market">{entry.market}</p>
      <p className="gp-signal-feed__odds tabular-nums">
        Odd {prev} → {curr}
      </p>
      <p className="gp-signal-feed__hint">
        Vantagem {edgeSign}
        {entry.edgePercent.toFixed(1)}% · Confiança {Math.round(entry.confidence)}
      </p>
    </motion.article>
  );
}

function LiveSignalFeedInner({
  signals,
  className = "",
  compact,
}: {
  signals: LiveSignalEntry[];
  className?: string;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(signals.length);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (signals.length > prevLen.current) {
      el.scrollTop = 0;
    }
    prevLen.current = signals.length;
  }, [signals.length]);

  return (
    <aside
      className={`gp-signal-feed gp-signal-feed--sport gp-signal-feed--premium ${compact ? "gp-signal-feed--compact" : ""} ${className}`.trim()}
      aria-label="Movimentos ao vivo"
    >
      <header className="gp-signal-feed__header">
        <Radio className="h-4 w-4 shrink-0 text-[var(--gp-red)]" aria-hidden />
        <div>
          <p className="gp-signal-feed__title">{TERMINAL_COPY.feedTitle}</p>
          <p className="gp-signal-feed__sub">{TERMINAL_COPY.feedSub}</p>
        </div>
        <span className="gp-signal-feed__count tabular-nums">{signals.length}</span>
      </header>
      <p className="gp-signal-feed__help px-3 pb-2">
        <SportsTooltip tip={TOOLTIPS.mercadoAcelerando} label="O que significa?" />
      </p>
      <div ref={scrollRef} className="gp-signal-feed__scroll">
        <AnimatePresence initial={false}>
          {signals.length === 0 ? (
            <p className="gp-signal-feed__empty">Nenhum movimento forte no momento. Os jogos aparecem aqui quando esquentam.</p>
          ) : (
            signals.map((s) => <SignalRow key={s.id} entry={s} />)
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

export default memo(LiveSignalFeedInner);
