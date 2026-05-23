import AppShell from "@/components/layout/AppShell";
import ProGate from "@/components/layout/ProGate";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import { PAGE_COPY } from "@/lib/ux/productCopy";

export default function AnalyticsPage() {
  const copy = PAGE_COPY.analytics;
  return (
    <AppShell title={copy.title} subtitle={copy.subtitle} intro={copy.intro}>
      <ProGate>
        <AnalyticsDashboard />
      </ProGate>
    </AppShell>
  );
}
