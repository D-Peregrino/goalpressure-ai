import AppShell from "@/components/layout/AppShell";
import ValidationDashboard from "@/components/validation/ValidationDashboard";

export default function ValidationPage() {
  return (
    <AppShell title="Validation Lab" subtitle="Quantitative calibration">
      <ValidationDashboard />
    </AppShell>
  );
}
