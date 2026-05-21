"use client";

import { DETECTIONS } from "@/lib/design/brand";

export default function TerminalPreviewSection() {
  return (
    <section className="gp-landing-section gp-landing-section--muted">
      <div className="gp-landing-container">
        <p className="gp-landing-eyebrow">Prova visual · O que detectamos</p>
        <h2 className="gp-landing-section__title">Radar quantitativo em tempo real</h2>
        <div className="gp-detection-grid">
          {DETECTIONS.map((d) => (
            <div key={d} className="gp-detection-card">
              <span className="gp-detection-card__dot" aria-hidden />
              <p>{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
