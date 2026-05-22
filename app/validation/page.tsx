import AppShell from "@/components/layout/AppShell";
import ValidationDashboard from "@/components/validation/ValidationDashboard";
import { PAGE_COPY } from "@/lib/ux/productCopy";

export default function ValidationPage() {
  const copy = PAGE_COPY.validation;
  return (
    <AppShell title={copy.title} subtitle={copy.subtitle} intro={copy.intro}>
      <ValidationDashboard />
    </AppShell>
  );
}
