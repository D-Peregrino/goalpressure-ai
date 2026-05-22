"use client";

import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Radio } from "lucide-react";
import type { OperationalAlert } from "@/lib/ux/operationalIntelligence";
import OperationalAlertFeed from "@/components/terminal/OperationalAlertFeed";
import { TERMINAL_COPY } from "@/lib/ux/sportsLanguage";

function OperationalAlertFeedMobileInner({
  alerts,
}: {
  alerts: OperationalAlert[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="gp-op-alert-mobile lg:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="gp-op-alert-mobile__toggle"
        aria-expanded={open}
      >
        <Radio className="h-4 w-4 text-[var(--gp-red)]" />
        <span className="gp-op-alert-mobile__label">{TERMINAL_COPY.alertTitle}</span>
        <span className="gp-op-alert-mobile__count tabular-nums">{alerts.length}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="gp-op-alert-mobile__panel"
          >
            <OperationalAlertFeed alerts={alerts} compact />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default memo(OperationalAlertFeedMobileInner);
