"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import MarketingLayout from "@/components/layout/MarketingLayout";
import AppLoading from "@/components/layout/AppLoading";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type { PlanId } from "@/lib/subscription/plans";

function CheckoutContent() {
  const params = useSearchParams();
  const planId = (params.get("plano") ?? params.get("plan") ?? "fundador") as PlanId;
  const couponCode = params.get("cupom") ?? undefined;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchWithAuth("/api/billing/create-checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId, couponCode }),
        });
        const body = (await res.json()) as { url?: string; error?: string };
        if (!res.ok || !body.url) {
          setError(body.error ?? "Não foi possível iniciar o checkout.");
          return;
        }
        window.location.href = body.url;
      } catch {
        setError("Erro de conexão. Tente novamente.");
      }
    })();
  }, [planId, couponCode]);

  if (!error) return <AppLoading label="Redirecionando para o checkout…" />;

  return (
    <div className="gp-val-api-error">
      <strong>Checkout indisponível</strong>
      <p>{error}</p>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <MarketingLayout narrow>
      <Suspense fallback={<AppLoading label="Carregando checkout…" />}>
        <CheckoutContent />
      </Suspense>
    </MarketingLayout>
  );
}

