import AppShell from "@/components/layout/AppShell";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <AppShell title="Analytics" subtitle="Performance intelligence">
      <AnalyticsDashboard />
    </AppShell>
  );
}
