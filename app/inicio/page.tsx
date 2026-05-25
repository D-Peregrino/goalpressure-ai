import AppShell from "@/components/layout/AppShell";
import PersonalDashboard from "@/components/dashboard/PersonalDashboard";

export default function InicioPage() {
  return (
    <AppShell
      darkPremium
      title="Seu painel"
      subtitle="GoalPressure · operação contínua"
      intro="Tudo o que você acompanha, em um só lugar."
    >
      <PersonalDashboard />
    </AppShell>
  );
}
