import AppShell from "@/components/layout/AppShell";
import ResearchDashboard from "@/components/research/ResearchDashboard";

export default function ResearchPage() {
  return (
    <AppShell title="Research Lab" subtitle="Experimental intelligence">
      <ResearchDashboard />
    </AppShell>
  );
}
