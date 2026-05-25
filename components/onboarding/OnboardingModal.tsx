"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, Crosshair, Flame, Sparkles, Target, X } from "lucide-react";
import { ONBOARDING_STEPS } from "@/lib/subscription/commercialCopy";
import { FLOW_EASE } from "@/components/ui/terminal/motion";

const ICONS = {
  pressure: Activity,
  tactical: Crosshair,
  edge: Target,
  heat: Flame,
  narrative: Sparkles,
} as const;

export default function OnboardingModal({
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
  const current = ONBOARDING_STEPS[step];
  const Icon = current ? ICONS[current.icon] : Sparkles;
  const isLast = step >= ONBOARDING_STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="gp-onboard-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="gp-onboard-title"
        >
          <motion.div
            className="gp-onboard"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.45, ease: FLOW_EASE }}
          >
            <button
              type="button"
              className="gp-onboard__close"
              onClick={onSkip}
              aria-label="Fechar"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="gp-onboard__icon-wrap">
              <Icon className="h-7 w-7 text-[var(--gp-red)]" aria-hidden />
            </div>

            <p className="gp-onboard__step">
              {step + 1} / {ONBOARDING_STEPS.length}
            </p>
            <h2 id="gp-onboard-title" className="gp-onboard__title">
              {current?.title}
            </h2>
            <p className="gp-onboard__body">{current?.body}</p>

            <div className="gp-onboard__dots">
              {ONBOARDING_STEPS.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`gp-onboard__dot ${i === step ? "gp-onboard__dot--on" : ""}`}
                  onClick={() => onStep(i)}
                  aria-label={`Passo ${i + 1}`}
                />
              ))}
            </div>

            <div className="gp-onboard__actions">
              <button type="button" className="gp-onboard__ghost" onClick={onSkip}>
                Pular
              </button>
              {isLast ? (
                <button type="button" className="gp-onboard__primary" onClick={onComplete}>
                  Começar tour
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
