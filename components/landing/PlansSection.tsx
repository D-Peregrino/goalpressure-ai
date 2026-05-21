"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PRICING, AUDIENCE } from "@/lib/design/brand";

export default function PlansSection() {
  return (
    <>
      <section className="gp-landing-section gp-landing-section--muted">
        <div className="gp-landing-container">
          <p className="gp-landing-eyebrow">Para quem é</p>
          <ul className="gp-audience-list">
            {AUDIENCE.map((a) => (
              <li key={a}>
                <span className="gp-audience-list__dot" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="gp-landing-section">
        <div className="gp-landing-container">
          <p className="gp-landing-eyebrow text-center">Planos</p>
          <h2 className="gp-landing-section__title text-center">Acesso institucional</h2>
          <div className="gp-pricing-grid">
            {PRICING.map((p, i) => (
              <div
                key={p.name}
                className={`gp-pricing-card ${i === 1 ? "gp-pricing-card--featured" : ""}`}
              >
                <p className="gp-landing-eyebrow">{p.name}</p>
                <p className="gp-pricing-card__price">{p.price}</p>
                <p className="gp-pricing-card__desc">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-landing-cta">
        <div className="gp-landing-container gp-landing-cta__inner">
          <h2 className="gp-landing-cta__title">Entre na lista do beta fechado</h2>
          <p className="gp-landing-cta__sub">
            Acesso antecipado ao terminal live · vagas limitadas
          </p>
          <Link href="/terminal" className="gp-btn gp-btn--primary">
            Solicitar acesso
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
