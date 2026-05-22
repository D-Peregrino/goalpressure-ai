import AppShell from "@/components/layout/AppShell";
import ResearchDashboard from "@/components/research/ResearchDashboard";
import { PAGE_COPY } from "@/lib/ux/productCopy";

export default function ResearchPage() {
  const copy = PAGE_COPY.research;
  return (
    <AppShell title={copy.title} subtitle={copy.subtitle} intro={copy.intro}>
      <ResearchDashboard />
    </AppShell>
  );
}
