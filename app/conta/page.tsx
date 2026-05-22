"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import AccountShell from "@/components/account/AccountShell";
import ProfileForm from "@/components/account/ProfileForm";
import BillingSummary from "@/components/account/BillingSummary";
import AlertPreferences from "@/components/account/AlertPreferences";
import { useAuth } from "@/hooks/useAuth";

function ContaContent() {
  const params = useSearchParams();
  const { refreshAccount } = useAuth();
  const pagamentoOk = params.get("pagamento") === "ok";

  useEffect(() => {
    if (pagamentoOk) refreshAccount();
  }, [pagamentoOk, refreshAccount]);

  return (
    <AccountShell>
      {pagamentoOk && (
        <p className="gp-conta-banner">Pagamento confirmado. Bem-vindo ao Plano Fundador!</p>
      )}
      <h1 className="gp-conta-title">Minha conta</h1>
      <div className="gp-conta-grid">
        <ProfileForm />
        <BillingSummary />
        <AlertPreferences />
      </div>
    </AccountShell>
  );
}

export default function ContaPage() {
  return (
    <Suspense fallback={<AccountShell><p>Carregando…</p></AccountShell>}>
      <ContaContent />
    </Suspense>
  );
}
