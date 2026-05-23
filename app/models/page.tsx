import AppShell from "@/components/layout/AppShell";
import ProGate from "@/components/layout/ProGate";
import ModelsPanel from "@/components/models/ModelsPanel";
import { PAGE_COPY } from "@/lib/ux/productCopy";

export default function ModelsPage() {
  const copy = PAGE_COPY.models;
  return (
    <AppShell title={copy.title} subtitle={copy.subtitle} intro={copy.intro}>
      <ProGate>
        <ModelsPanel />
      </ProGate>
    </AppShell>
  );
}
