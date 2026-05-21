"use client";

import { motion, AnimatePresence } from "framer-motion";
import ExecutionBadge from "@/components/ui/terminal/ExecutionBadge";
import type { ExecutionDecisionUi } from "@/components/ui/terminal/ExecutionBadge";
import { getMarketLabel } from "@/types/domain";
import type { MarketType } from "@/types/domain";

export interface SignalFeedItem {
  id: string;
  matchLabel: string;
  market: MarketType | string;
  minute: number;
  odd: number;
  fairOdd?: number;
  ev: number;
  confidence: number;
  reason?: string;
  executionDecision?: ExecutionDecisionUi;
  executionGrade?: string;
  dominantEngines?: string[];
  timestamp?: string;
  telegramStatus?: string;
}

export default function SignalFeed({
  items,
  empty = "Aguardando sinais com consenso institucional…",
}: {
  items: SignalFeedItem[];
  empty?: string;
}) {
  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout" initial={false}>
        {items.length === 0 ? (
          <p className="font-mono-data t-muted py-10 text-center">{empty}</p>
        ) : (
          items.map((s) => {
            const isExecute =
              s.executionDecision === "EXECUTE" ||
              s.executionDecision === "AGGRESSIVE_EXECUTE";
            return (
              <motion.article
                key={s.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`t-card p-5 ${isExecute ? "t-card--glow" : ""}`}
              >
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base">{s.matchLabel}</p>
                    <p className="mt-1 font-mono-data text-[var(--text-muted-on-dark)]">
                      {typeof s.market === "string" && s.market in { OVER_0_5: 1, OVER_1_5: 1 }
                        ? getMarketLabel(s.market as MarketType)
                        : s.market}{" "}
                      · {s.minute}&apos;
                    </p>
                  </div>
                  {s.executionDecision && (
                    <ExecutionBadge decision={s.executionDecision} />
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 font-mono-data sm:grid-cols-4">
                  <div>
                    <p className="t-label">Odd</p>
                    <p className="mt-1 font-medium">{s.odd.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="t-label">Fair odd</p>
                    <p className="mt-1 font-medium">{s.fairOdd?.toFixed(2) ?? "—"}</p>
                  </div>
                  <div>
                    <p className="t-label">EV</p>
                    <p className="mt-1 font-medium t-accent">{(s.ev * 100).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="t-label">Conf.</p>
                    <p className="mt-1 font-medium">{Math.round(s.confidence)}</p>
                  </div>
                </div>
                {s.reason && (
                  <p className="mt-4 border-t border-white/[0.08] pt-4 font-mono-data text-[var(--text-muted-on-dark)]">
                    {s.reason}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-3 font-mono-data text-xs text-[var(--text-muted-on-dark)]">
                  {s.executionGrade && <span>Grade {s.executionGrade}</span>}
                  {s.dominantEngines?.map((e) => (
                    <span key={e}>{e}</span>
                  ))}
                  {s.telegramStatus && (
                    <span className="t-accent/80">TG · {s.telegramStatus}</span>
                  )}
                  {s.timestamp && <span>{s.timestamp}</span>}
                </div>
              </motion.article>
            );
          })
        )}
      </AnimatePresence>
    </div>
  );
}
