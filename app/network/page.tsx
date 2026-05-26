import AppShell from "@/components/layout/AppShell";
import NetworkPage from "@/components/network/NetworkPage";

export const metadata = {
  title: "Signal Exchange — GoalPressure AI",
  description:
    "Rede operacional contextual: consenso coletivo, sinais compartilhados e reputação de operadores.",
};

export default function NetworkRoutePage() {
  return (
    <AppShell
      darkPremium
      title="Signal Exchange"
      subtitle="GoalPressure · rede operacional"
      intro="Consenso contextual, pressão coletiva e timeline institucional — sem chat aberto."
    >
      <NetworkPage />
    </AppShell>
  );
}
