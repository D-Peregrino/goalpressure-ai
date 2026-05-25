import AppShell from "@/components/layout/AppShell";
import PersonalDashboard from "@/components/dashboard/PersonalDashboard";

export default function MinhaCentralPage() {
  return (
    <AppShell
      darkPremium
      title="Minha central"
      subtitle="GoalPressure · operação contínua"
      intro="Favoritos, alertas, leituras e jogos quentes — personalizado para você."
    >
      <PersonalDashboard />
    </AppShell>
  );
}
