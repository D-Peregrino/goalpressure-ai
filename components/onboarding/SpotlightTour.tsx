"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SPOTLIGHT_STEPS } from "@/lib/subscription/commercialCopy";
import { FLOW_EASE } from "@/components/ui/terminal/motion";

export default function SpotlightTour({
  open,
  step,
  onStep,
  onComplete,
  onSkip,
}: {
  open: boolean;
  step: number;
  onStep: (n: number) => void;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const current = SPOTLIGHT_STEPS[step];
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!open || !current?.target) {
      setRect(null);
      return;
    }
    const el = document.querySelector(current.target);
    if (!el) {
      setRect(null);
      return;
    }
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, step, current?.target]);

  const isLast = step >= SPOTLIGHT_STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gp-spotlight-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
        >
          {rect && (
            <div
              className="gp-spotlight-hole"
              style={{
                top: rect.top - 8,
                left: rect.left - 8,
                width: rect.width + 16,
                height: rect.height + 16,
              }}
            />
          )}
          <motion.div
            className="gp-spotlight-card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: FLOW_EASE }}
          >
            <p className="gp-spotlight-card__step">
              Tour {step + 1} / {SPOTLIGHT_STEPS.length}
            </p>
            <h3 className="gp-spotlight-card__title">{current?.title}</h3>
            <p className="gp-spotlight-card__body">{current?.body}</p>
            <div className="gp-onboard__actions">
              <button type="button" className="gp-onboard__ghost" onClick={onSkip}>
                Pular tour
              </button>
              {isLast ? (
                <button type="button" className="gp-onboard__primary" onClick={onComplete}>
                  Concluir
                </button>
              ) : (
                <button
                  type="button"
                  className="gp-onboard__primary"
                  onClick={() => onStep(step + 1)}
                >
                  Próximo
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
