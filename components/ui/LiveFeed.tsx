"use client";

import { motion, AnimatePresence } from "framer-motion";
import ExecutionBadge from "@/components/ui/ExecutionBadge";
import type { ExecutionGrade } from "@/lib/design/tokens";

export interface LiveFeedItem {
  id: string;
  primary: string;
  secondary: string;
  meta?: string;
  grade?: ExecutionGrade | string;
  accent?: boolean;
}

export default function LiveFeed({
  items,
  title,
  empty = "Awaiting live intelligence…",
}: {
  items: LiveFeedItem[];
  title: string;
  empty?: string;
}) {
  return (
    <div className="gp-card p-4 h-full flex flex-col min-h-[220px]">
      <p className="gp-label mb-3">{title}</p>
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 gp-scrollbar">
        <AnimatePresence mode="popLayout" initial={false}>
          {items.length === 0 ? (
            <p className="font-mono text-[11px] text-muted">{empty}</p>
          ) : (
            items.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className={`rounded-lg border px-3 py-2.5 ${
                  item.accent
                    ? "border-pressure/30 bg-pressure/5"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-[11px] font-semibold text-foreground">
                      {item.primary}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                      {item.secondary}
                    </p>
                  </div>
                  {item.grade && <ExecutionBadge grade={item.grade} size="sm" />}
                </div>
                {item.meta && (
                  <p className="mt-1.5 font-mono text-[9px] text-muted/80">{item.meta}</p>
                )}
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
