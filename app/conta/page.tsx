"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import ProfileForm from "@/components/account/ProfileForm";
import BillingSummary from "@/components/account/BillingSummary";
import AlertPreferences from "@/components/account/AlertPreferences";
import AppLoading from "@/components/layout/AppLoading";
import { useAuth } from "@/hooks/useAuth";

function ContaContent() {
  const params = useSearchParams();
  const { refreshAccount } = useAuth();
  const pagamentoOk = params.get("pagamento") === "ok";

  useEffect(() => {
    if (pagamentoOk) refreshAccount();
  }, [pagamentoOk, refreshAccount]);

  return (
    <>
      {pagamentoOk && (
        <p className="gp-conta-banner">Pagamento confirmado. Bem-vindo ao Plano Fundador!</p>
      )}
      <h1 className="gp-conta-title">Minha conta</h1>
      <div className="gp-conta-grid gp-conta-grid--saas">
        <ProfileForm />
        <BillingSummary />
        <AlertPreferences />
      </div>
    </>
  );
}

export default function ContaPage() {
  return (
    <AppShell
      requireAuth
      darkPremium
      title="Minha conta"
      subtitle="Área do cliente"
      intro="Gerencie perfil, plano e preferências de alerta."
    >
      <Suspense fallback={<AppLoading />}>
        <ContaContent />
      </Suspense>
    </AppShell>
  );
}
