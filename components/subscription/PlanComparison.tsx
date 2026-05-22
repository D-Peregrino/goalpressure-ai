"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TIER_DISPLAY } from "@/lib/subscription/commercialCopy";
import { TIERS, TIER_ORDER, type SubscriptionTier } from "@/lib/subscription/tiers";

function checkoutHref(tier: SubscriptionTier): string {
  if (tier === "free") return "/terminal";
  return `/api/checkout?plan=${tier}`;
}

export default function PlanComparison({
  highlight,
}: {
  highlight?: SubscriptionTier;
}) {
  const { tier: current } = useSubscription();

  return (
    <div className="gp-plan-grid">
      {TIER_ORDER.map((id) => {
        const t = TIERS[id];
        const isCurrent = current === id;
        const featured = highlight ? id === highlight : id === "pro";
        return (
          <article
            key={id}
            className={`gp-plan-card ${featured ? "gp-plan-card--featured" : ""} ${isCurrent ? "gp-plan-card--current" : ""}`}
          >
            {featured && <span className="gp-plan-card__badge">Mais escolhido</span>}
            {isCurrent && <span className="gp-plan-card__badge gp-plan-card__badge--current">Seu plano</span>}
            <p className="gp-plan-card__name">{TIER_DISPLAY[id]}</p>
            <p className="gp-plan-card__price">{t.priceLabel}</p>
            <p className="gp-plan-card__desc">{t.description}</p>
            <ul className="gp-plan-card__features">
              {t.features.map((f) => (
                <li key={f}>
                  <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  {f}
                </li>
              ))}
            </ul>
            {t.trialDays > 0 && (
              <p className="gp-plan-card__trial">Trial {t.trialDays} dias</p>
            )}
            {isCurrent ? (
              <span className="gp-plan-card__cta gp-plan-card__cta--muted">Plano ativo</span>
            ) : (
              <Link
                href={checkoutHref(id)}
                className={`gp-plan-card__cta ${featured ? "gp-plan-card__cta--primary" : ""}`}
              >
                {id === "free"
                  ? "Continuar Free"
                  : id === "institutional"
                    ? "Trial Elite"
                    : "Trial Pro"}
              </Link>
            )}
          </article>
        );
      })}
    </div>
  );
}
