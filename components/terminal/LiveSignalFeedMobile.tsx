"use client";

import { memo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, X } from "lucide-react";
import type { LiveSignalEntry } from "@/lib/signals/liveSignalBuilder";
import LiveSignalFeed from "@/components/terminal/LiveSignalFeed";

function LiveSignalFeedMobileInner({ signals }: { signals: LiveSignalEntry[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="gp-signal-feed-mobile lg:hidden">
      <button
        type="button"
        className="gp-signal-feed-mobile__trigger"
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <Radio className="h-4 w-4" />
        Movimentos
        <span className="gp-signal-feed-mobile__badge tabular-nums">{signals.length}</span>
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="gp-signal-feed-mobile__overlay"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="gp-signal-feed-mobile__drawer"
            >
              <button
                type="button"
                className="gp-signal-feed-mobile__close"
                onClick={() => setOpen(false)}
                aria-label="Fechar feed"
              >
                <X className="h-5 w-5" />
              </button>
              <LiveSignalFeed signals={signals} compact />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(LiveSignalFeedMobileInner);
