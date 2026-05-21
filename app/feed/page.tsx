import AppShell from "@/components/layout/AppShell";
import LiveDashboard from "@/components/LiveDashboard";

export default function FeedPage() {
  return (
    <AppShell
      title="Live Feed"
      subtitle="Monitoramento de partidas em tempo real"
    >
      <LiveDashboard />
    </AppShell>
  );
}
