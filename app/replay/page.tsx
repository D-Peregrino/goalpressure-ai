import AppShell from "@/components/layout/AppShell";
import ReplayPlayer from "@/components/replay/ReplayPlayer";

export const metadata = {
  title: "Replay Engine — GoalPressure AI",
  description:
    "Reprodução minuto a minuto de partidas históricas com evolução de GPI, pressão, consenso e alertas.",
};

export default function ReplayPage() {
  return (
    <AppShell
      darkPremium
      title="Replay Engine"
      subtitle="GoalPressure · playback histórico"
      intro="Reproduza partidas passadas com narrativa contextual, consenso coletivo e telemetria institucional."
    >
      <ReplayPlayer />
    </AppShell>
  );
}
