"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { hasTerminalAccess } from "@/lib/auth/entitlements";
import { tierMeetsMinimum } from "@/lib/subscription/tiers";
import { planLabelPt } from "@/lib/subscription/permissions";
import AppLoading from "@/components/layout/AppLoading";

export default function ProGate({ children }: { children: React.ReactNode }) {
  const { loading: authLoading, user, plan, subscriptionStatus } = useAuth();
  const { tier, isAdmin } = useSubscription();

  if (authLoading) {
    return <AppLoading label="Carregando permissões…" />;
  }

  if (!user) {
    return (
      <div className="gp-pro-gate">
        <h2>Faça login para continuar</h2>
        <p>Esta área exige uma conta GoalPressure.</p>
        <Link href="/entrar" className="gp-btn gp-btn--primary">
          Entrar
        </Link>
      </div>
    );
  }

  if (
    !isAdmin &&
    !hasTerminalAccess(plan, user.role, subscriptionStatus) &&
    !tierMeetsMinimum(tier, "pro")
  ) {
    return (
      <div className="gp-pro-gate">
        <h2>Recurso Profissional</h2>
        <p>
          Seu plano atual ({planLabelPt(plan)}) não inclui esta seção. Ative o Plano
          Fundador para acesso completo.
        </p>
        <div className="gp-pro-gate__actions">
          <Link href="/precos" className="gp-btn gp-btn--primary">
            Ver planos
          </Link>
          <Link href="/terminal" className="gp-btn gp-btn--secondary">
            Voltar à central
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
