import AppShell from "@/components/layout/AppShell";
import LiveDashboard from "@/components/LiveDashboard";

export default function TerminalPage() {
  return (
    <AppShell
      title="Live Feed"
      subtitle="Real-time match monitoring"
    >
      <LiveDashboard />
    </AppShell>
  );
}
