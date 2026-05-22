"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PRICING, AUDIENCE } from "@/lib/design/brand";
import { TIERS as TIER_DEFS } from "@/lib/subscription/tiers";

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

      <section id="pricing" className="gp-landing-section">
        <div className="gp-landing-container">
          <p className="gp-landing-eyebrow text-center">Pricing</p>
          <h2 className="gp-landing-section__title text-center">Free · Pro · Elite</h2>
          <div className="gp-pricing-grid">
            {PRICING.map((p) => {
              const tier = TIER_DEFS[p.tier];
              return (
                <div
                  key={p.name}
                  className={`gp-pricing-card ${"featured" in p && p.featured ? "gp-pricing-card--featured" : ""}`}
                >
                  <p className="gp-landing-eyebrow">{p.name}</p>
                  <p className="gp-pricing-card__price">{p.price}</p>
                  <p className="gp-pricing-card__desc">{p.desc}</p>
                  <ul className="gp-pricing-card__features">
                    {tier.features.map((f) => (
                      <li key={f}>
                        <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href={p.href} className="gp-btn gp-btn--primary gp-pricing-card__cta">
                    {p.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
