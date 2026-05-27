"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import { formatarPreco } from "@/lib/subscription/plans";
import PricingCards from "@/components/billing/PricingCards";
import BillingPortalButton from "@/components/billing/BillingPortalButton";
import SubscriptionBadge from "@/components/billing/SubscriptionBadge";
import AppLoading from "@/components/layout/AppLoading";

interface BillingStatus {
  subscription?: {
    plan_slug?: string;
    status?: string;
    current_period_end?: string | null;
    cancel_at_period_end?: boolean;
    coupon_code?: string | null;
    trial_ends_at?: string | null;
  };
  plan?: { slug: string; name: string };
  invoices?: Array<{
    id: string;
    amount_cents: number;
    currency: string;
    status: string;
    paid_at: string | null;
    created_at: string;
  }>;
  stripeCustomerId?: string | null;
}

function BillingContent() {
  const params = useSearchParams();
  const statusParam = params.get("status");
  const [data, setData] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth("/api/billing/status");
        const json = (await res.json()) as BillingStatus & { error?: string };
        if (!res.ok) throw new Error(json.error ?? "Falha ao carregar.");
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro");
      } finally {
        setLoading(false);
      }
    })();
  }, [statusParam]);

  if (loading) return <AppLoading label="Carregando assinatura…" />;
  if (error) {
    return (
      <p className="gp-billing-card__sub" style={{ color: "#f87171" }}>
        {error}
      </p>
    );
  }

  const sub = data?.subscription;
  const st = String(sub?.status ?? "inactive");
  const statusClass =
    st === "active"
      ? "gp-billing-status--active"
      : st === "trialing"
        ? "gp-billing-status--trialing"
        : "gp-billing-status--inactive";

  return (
    <div className="gp-billing-page">
      {statusParam === "success" ? (
        <p className="gp-billing-banner" role="status">
          Pagamento recebido. Seu acesso será liberado em instantes.
        </p>
      ) : null}

      <header className="gp-billing-hero">
        <h1>Assinatura</h1>
        <p>Plano, cobrança e histórico — integração Stripe + Supabase.</p>
        <div style={{ marginTop: "0.75rem" }}>
          <SubscriptionBadge />
        </div>
      </header>

      <div className="gp-billing-grid gp-billing-grid--2" style={{ marginBottom: "2rem" }}>
        <div className="gp-billing-card">
          <p className="gp-billing-card__label">Plano atual</p>
          <p className="gp-billing-card__value">{data?.plan?.name ?? "Free"}</p>
          <p className="gp-billing-card__sub">
            Status{" "}
            <span className={`gp-billing-status ${statusClass}`}>{st}</span>
          </p>
          {sub?.current_period_end ? (
            <p className="gp-billing-card__sub">
              Próxima renovação:{" "}
              {new Date(sub.current_period_end).toLocaleDateString("pt-BR")}
            </p>
          ) : null}
          {sub?.cancel_at_period_end ? (
            <p className="gp-billing-card__sub">Cancelamento ao fim do período.</p>
          ) : null}
          {sub?.trial_ends_at ? (
            <p className="gp-billing-card__sub">
              Trial até {new Date(sub.trial_ends_at).toLocaleDateString("pt-BR")}
            </p>
          ) : null}
          {sub?.coupon_code ? (
            <p className="gp-billing-card__sub">Cupom: {sub.coupon_code}</p>
          ) : null}
        </div>

        <div className="gp-billing-card">
          <p className="gp-billing-card__label">Ações</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
            {data?.stripeCustomerId ? (
              <BillingPortalButton className="gp-billing-btn--primary" />
            ) : null}
            <Link href="/terminal" className="gp-billing-btn">
              Terminal
            </Link>
            <Link href="/conta" className="gp-billing-btn">
              Conta
            </Link>
          </div>
          <p className="gp-billing-card__sub" style={{ marginTop: "1rem" }}>
            No portal Stripe você pode atualizar cartão, ver faturas e cancelar a assinatura.
          </p>
        </div>
      </div>

      <section style={{ marginBottom: "2rem" }}>
        <h2 style={{ fontSize: "1.15rem", marginBottom: "1rem" }}>Upgrade de plano</h2>
        <PricingCards />
      </section>

      <section className="gp-billing-card">
        <p className="gp-billing-card__label">Histórico de faturas</p>
        {!data?.invoices?.length ? (
          <p className="gp-billing-card__sub">Nenhuma fatura registrada ainda.</p>
        ) : (
          <table className="gp-billing-invoices">
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.invoices.map((inv) => (
                <tr key={inv.id}>
                  <td>{new Date(inv.created_at).toLocaleDateString("pt-BR")}</td>
                  <td>{formatarPreco(inv.amount_cents)}</td>
                  <td>{inv.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

export default function BillingDashboard() {
  return (
    <Suspense fallback={<AppLoading label="Carregando…" />}>
      <BillingContent />
    </Suspense>
  );
}
