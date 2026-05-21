"use client";

import { ENGINES, PIPELINE } from "@/lib/design/brand";
import { TerminalCard } from "@/components/ui/terminal";
import { ChevronRight } from "lucide-react";

export default function EnginesSection() {
  return (
    <>
      <section className="gp-landing-section">
        <div className="gp-landing-container">
          <p className="gp-landing-eyebrow">Pipeline institucional</p>
          <div className="gp-pipeline-row">
            {PIPELINE.map((step, i) => (
              <span key={step} className="gp-pipeline-row__item">
                <span className="gp-pipeline-chip">{step}</span>
                {i < PIPELINE.length - 1 && (
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-40" />
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-landing-section gp-landing-section--muted">
        <div className="gp-landing-container">
          <p className="gp-landing-eyebrow">Motores quantitativos</p>
          <h2 className="gp-landing-section__title">Engines proprietárias</h2>
          <div className="gp-engines-grid">
            {ENGINES.map((e) => (
              <TerminalCard key={e.id} surface padding="sm">
                <p className="font-display text-base text-[var(--text)]">{e.name}</p>
                <p className="mt-2 font-body text-sm leading-relaxed text-[var(--muted)]">
                  {e.desc}
                </p>
              </TerminalCard>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
