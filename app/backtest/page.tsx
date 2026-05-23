import AppShell from "@/components/layout/AppShell";
import ProGate from "@/components/layout/ProGate";
import BacktestDashboard from "@/components/backtest/BacktestDashboard";
import { PAGE_COPY } from "@/lib/ux/productCopy";

export default function BacktestPage() {
  const copy = PAGE_COPY.backtest;
  return (
    <AppShell title={copy.title} subtitle={copy.subtitle} intro={copy.intro}>
      <ProGate>
        <BacktestDashboard />
      </ProGate>
    </AppShell>
  );
}
