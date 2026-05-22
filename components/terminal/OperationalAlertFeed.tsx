"use client";

import { memo, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Radio } from "lucide-react";
import type { OperationalAlert } from "@/lib/ux/operationalIntelligence";
import { momentClass } from "@/lib/ux/operationalIntelligence";
import { alertSlide } from "@/components/ui/terminal/motion";
import { formatSignalTime } from "@/lib/signals/liveSignalBuilder";
import { TERMINAL_COPY } from "@/lib/ux/sportsLanguage";

function AlertRow({ alert }: { alert: OperationalAlert }) {
  return (
    <motion.article
      layout
      layoutId={`alert-${alert.id}`}
      variants={alertSlide}
      initial="hidden"
      animate="show"
      exit="exit"
      className={`gp-op-alert ${momentClass(alert.momentLevel)}`}
    >
      <time className="gp-type-caption gp-op-alert__time">{formatSignalTime(alert.timestamp)}</time>
      <p className="gp-type-title gp-op-alert__headline">{alert.headline}</p>
      <p className="gp-type-body gp-op-alert__narrative">{alert.narrative}</p>
      <Link
        href={`/match/${encodeURIComponent(alert.fixtureId)}`}
        className="gp-op-alert__match"
      >
        {alert.matchLabel}
        {alert.minuteLabel ? ` · ${alert.minuteLabel}` : ""}
      </Link>
      {alert.market && alert.edgePercent > 0 && (
        <p className="gp-op-alert__meta tabular-nums">
          {alert.market} · vantagem +{alert.edgePercent.toFixed(1)}%
        </p>
      )}
    </motion.article>
  );
}

function OperationalAlertFeedInner({
  alerts,
  className = "",
  compact,
}: {
  alerts: OperationalAlert[];
  className?: string;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLen = useRef(alerts.length);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (alerts.length > prevLen.current) {
      el.scrollTop = 0;
    }
    prevLen.current = alerts.length;
  }, [alerts.length]);

  return (
    <aside
      className={`gp-op-alert-feed ${compact ? "gp-op-alert-feed--compact" : ""} ${className}`.trim()}
      aria-label="Alertas ao vivo"
    >
      <header className="gp-op-alert-feed__header">
        <Radio className="h-4 w-4 shrink-0 text-[var(--gp-red)]" aria-hidden />
        <div>
          <p className="gp-type-title gp-op-alert-feed__title">{TERMINAL_COPY.alertTitle}</p>
          <p className="gp-type-caption gp-op-alert-feed__sub">{TERMINAL_COPY.alertSub}</p>
        </div>
        <span className="gp-op-alert-feed__count tabular-nums">{alerts.length}</span>
      </header>
      <div ref={scrollRef} className="gp-op-alert-feed__scroll">
        <AnimatePresence initial={false} mode="popLayout">
          {alerts.length === 0 ? (
            <p className="gp-op-alert-feed__empty">
              {TERMINAL_COPY.alertEmpty}
            </p>
          ) : (
            alerts.map((a) => <AlertRow key={a.id} alert={a} />)
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

export default memo(OperationalAlertFeedInner);
