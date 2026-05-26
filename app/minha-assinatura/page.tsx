"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import AppLoading from "@/components/layout/AppLoading";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import { planLabelPt } from "@/lib/subscription/permissions";

function MinhaAssinaturaContent() {
  const params = useSearchParams();
  const statusParam = params.get("status");
  const [loading, setLoading] = useState(true);
  const [sub, setSub] = useState<any>(null);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth("/api/billing/status");
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Falha ao carregar status.");
        setSub(body.subscription ?? null);
        setPayment(body.lastPayment ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao carregar.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <AppLoading label="Carregando assinatura…" />;
  if (error) {
    return (
      <div className="gp-val-api-error">
        <strong>Erro</strong>
        <p>{error}</p>
      </div>
    );
  }

  const plan = (sub?.plan ?? "free") as any;
  const st = String(sub?.status ?? "inactive");

  return (
    <div className="gp-conta-grid">
      {statusParam === "ok" && (
        <p className="gp-conta-banner">Pagamento aprovado. Acesso será liberado automaticamente.</p>
      )}
      {statusParam === "pending" && (
        <p className="gp-conta-banner">Pagamento pendente. Vamos liberar assim que confirmar.</p>
      )}
      {statusParam === "fail" && (
        <p className="gp-conta-banner">Pagamento não aprovado. Você pode tentar novamente.</p>
      )}

      <div className="gp-card">
        <h2>Plano atual</h2>
        <p>
          <strong>{planLabelPt(plan)}</strong> · status <strong>{st}</strong>
        </p>
        <p className="gp-muted">
          Provedor: {sub?.provider ?? "—"} · Assinatura: {sub?.provider_subscription_id ?? "—"}
        </p>
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <Link href="/precos" className="gp-btn gp-btn--primary">
            Ver planos
          </Link>
          <Link href="/conta" className="gp-btn gp-btn--secondary">
            Minha conta
          </Link>
        </div>
      </div>

      <div className="gp-card">
        <h2>Último pagamento</h2>
        {payment ? (
          <>
            <p>
              Status <strong>{String(payment.status ?? "—")}</strong> ·{" "}
              {payment.amount_cents != null ? `R$ ${(Number(payment.amount_cents) / 100).toFixed(2)}` : "—"}
            </p>
            <p className="gp-muted">
              ID: {payment.provider_payment_id ?? payment.id ?? "—"} ·{" "}
              {payment.created_at ? new Date(payment.created_at).toLocaleString("pt-BR") : "—"}
            </p>
          </>
        ) : (
          <p className="gp-muted">Nenhum pagamento registrado.</p>
        )}
      </div>
    </div>
  );
}

export default function MinhaAssinaturaPage() {
  return (
    <AppShell
      requireAuth
      darkPremium
      title="Minha assinatura"
      subtitle="Status e pagamentos"
      intro="Acompanhe status, pagamentos e renovação."
    >
      <Suspense fallback={<AppLoading />}>
        <MinhaAssinaturaContent />
      </Suspense>
    </AppShell>
  );
}

