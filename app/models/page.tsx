import AppShell from "@/components/layout/AppShell";
import ModelsPanel from "@/components/models/ModelsPanel";

export default function ModelsPage() {
  return (
    <AppShell title="Models" subtitle="Configuration (read-only)">
      <ModelsPanel />
    </AppShell>
  );
}
