import AppShell from "@/components/layout/AppShell";
import BillingDashboard from "@/components/billing/BillingDashboard";
import AuthGuard from "@/components/layout/AuthGuard";

export const metadata = {
  title: "Assinatura — GoalPressure AI",
  description: "Gerencie seu plano, cobrança Stripe e histórico de pagamentos.",
};

export default function BillingPage() {
  return (
    <AppShell
      darkPremium
      title="Assinatura"
      subtitle="GoalPressure · SaaS"
      intro="Checkout seguro, desbloqueio automático e portal de cobrança."
      requireAuth
    >
      <AuthGuard>
        <div className="gp-billing">
          <BillingDashboard />
        </div>
      </AuthGuard>
    </AppShell>
  );
}
