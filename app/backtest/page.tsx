import AppShell from "@/components/layout/AppShell";
import BacktestDashboard from "@/components/backtest/BacktestDashboard";

export default function BacktestPage() {
  return (
    <AppShell title="Backtest" subtitle="Historical validation">
      <BacktestDashboard />
    </AppShell>
  );
}
