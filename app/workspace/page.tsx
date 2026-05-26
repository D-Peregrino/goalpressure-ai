import AppShell from "@/components/layout/AppShell";
import CopaSeasonalBanner from "@/components/copa/CopaSeasonalBanner";
import WorkspacePage from "@/components/workspace/WorkspacePage";

export const metadata = {
  title: "Workspace — GoalPressure AI",
  description: "Central operacional personalizada: watchlist, favoritos, alertas e resumo diário.",
};

export default function WorkspaceRoutePage() {
  return (
    <AppShell
      darkPremium
      title="Workspace"
      subtitle="GoalPressure · operação personalizada"
      intro="Sua mesa de trabalho ao vivo — jogos, alertas, ligas, times e histórico em um só lugar."
    >
      <CopaSeasonalBanner variant="workspace" />
      <WorkspacePage />
    </AppShell>
  );
}
