"use client";

import { useMemo } from "react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { evaluateGpiFromEnriched } from "@/lib/gpi/gpiEvaluate";
import type { GPIBreakdown } from "@/lib/gpi/gpi.types";

const ROWS: { key: keyof GPIBreakdown; label: string; invert?: boolean }[] = [
  { key: "pressure", label: "Pressão ofensiva" },
  { key: "predictive", label: "Preditivo" },
  { key: "ev", label: "EV contextual" },
  { key: "contextual", label: "Contextual" },
  { key: "adaptive", label: "Adaptive" },
  { key: "risk", label: "Risco", invert: true },
];

export default function GPIBreakdown({
  match,
  compact = false,
}: {
  match: EnrichedLiveMatch;
  compact?: boolean;
}) {
  const gpi = useMemo(() => evaluateGpiFromEnriched(match), [match]);
  const b = gpi.breakdown;

  return (
    <section className={`gp-gpi-breakdown ${compact ? "gp-gpi-breakdown--compact" : ""}`}>
      {!compact ? (
        <header className="gp-gpi-breakdown__head">
          <h4 className="gp-gpi-breakdown__title">Composição do GPI</h4>
          <span className="gp-gpi-breakdown__score">GPI {gpi.score}</span>
        </header>
      ) : (
        <p className="gp-gpi-breakdown__compact-label">GPI {gpi.score} · composição</p>
      )}

      <ul className="gp-gpi-breakdown__bars">
        {ROWS.map(({ key, label, invert }) => {
          const val = b[key];
          const width = invert ? Math.min(100, val * 1.2) : val;
          return (
            <li key={key}>
              <div className="gp-gpi-breakdown__row-top">
                <span>{label}</span>
                <strong>{Math.round(val)}</strong>
              </div>
              <div className="gp-gpi-breakdown__track">
                <span
                  className={`gp-gpi-breakdown__fill ${invert ? "gp-gpi-breakdown__fill--risk" : ""}`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
