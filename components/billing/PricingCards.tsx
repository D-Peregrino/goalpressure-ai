"use client";

import { useState } from "react";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import { OFFICIAL_PLANS, type PlanSlug } from "@/lib/billing/planSlugs";
import { formatarPreco, CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";
import { aplicarCupom } from "@/lib/subscription/coupons";
import { useAuth } from "@/contexts/AuthContext";

const ORDER: PlanSlug[] = ["free", "starter", "pro", "founder"];

export default function PricingCards({
  highlightSlug = "founder",
  showCoupon = true,
}: {
  highlightSlug?: PlanSlug;
  showCoupon?: boolean;
}) {
  const auth = useAuth();
  const isAuthenticated = Boolean(auth.user);
  const planSlug = auth.planSlug;
  const [loading, setLoading] = useState<PlanSlug | null>(null);
  const [coupon, setCoupon] = useState(CUPOM_BARBOSATIPS75);
  const [error, setError] = useState<string | null>(null);

  async function checkout(slug: PlanSlug) {
    if (slug === "free") return;
    if (!isAuthenticated) {
      window.location.href = `/entrar?redirect=/billing`;
      return;
    }
    setLoading(slug);
    setError(null);
    try {
      const res = await fetchWithAuth("/api/billing/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planSlug: slug,
          couponCode: slug === "founder" ? coupon : undefined,
        }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        setError(json.error ?? "Não foi possível iniciar o checkout.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setError("Erro de rede.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      {showCoupon ? (
        <div className="gp-billing-coupon">
          <input
            type="text"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value.toUpperCase())}
            placeholder="Cupom Founder"
            aria-label="Cupom de desconto"
          />
          <span className="gp-billing-card__sub">
            {CUPOM_BARBOSATIPS75}: 75% no plano Founder
          </span>
        </div>
      ) : null}

      {error ? (
        <p className="gp-billing-card__sub" style={{ color: "#f87171" }} role="alert">
          {error}
        </p>
      ) : null}

      <div className="gp-billing-pricing">
        {ORDER.map((slug) => {
          const plan = OFFICIAL_PLANS[slug];
          const isCurrent = planSlug === slug;
          let price = plan.monthlyPriceCents;
          if (slug === "founder" && coupon) {
            const c = aplicarCupom(coupon, price);
            if (c) price = c.valorFinalCentavos;
          }
          const featured = slug === highlightSlug;

          return (
            <article
              key={slug}
              className={`gp-billing-plan ${featured ? "gp-billing-plan--featured" : ""}`}
            >
              {featured ? <span className="gp-billing-plan__badge">Recomendado</span> : null}
              <h3>{plan.name}</h3>
              <p className="gp-billing-plan__price">
                {formatarPreco(price)}
                <span> /mês</span>
              </p>
              {slug === "starter" || slug === "pro" ? (
                <p className="gp-billing-card__sub">7 dias grátis · cancele quando quiser</p>
              ) : null}
              <ul>
                {plan.features.slice(0, 6).map((f) => (
                  <li key={f}>✓ {f.replace(/_/g, " ")}</li>
                ))}
              </ul>
              {slug === "free" ? (
                <span className="gp-billing-btn" style={{ opacity: 0.6 }}>
                  Plano atual
                </span>
              ) : (
                <button
                  type="button"
                  className={`gp-billing-btn ${featured ? "gp-billing-btn--primary" : ""}`}
                  disabled={loading === slug || isCurrent}
                  onClick={() => void checkout(slug)}
                >
                  {isCurrent
                    ? "Seu plano"
                    : loading === slug
                      ? "Redirecionando…"
                      : "Assinar"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
