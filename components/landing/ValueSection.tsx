"use client";

import { COMMERCIAL_VALUE } from "@/lib/design/brand";

export default function ValueSection() {
  return (
    <section className="gp-landing-section">
      <div className="gp-landing-container">
        <p className="gp-landing-eyebrow text-center">Por que GoalPressure</p>
        <h2 className="gp-landing-section__title text-center">
          Inteligência esportiva que vende clareza
        </h2>
        <div className="gp-value-grid">
          {COMMERCIAL_VALUE.map((v) => (
            <article key={v.title} className="gp-value-card">
              <h3 className="gp-value-card__title">{v.title}</h3>
              <p className="gp-value-card__desc">{v.desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
