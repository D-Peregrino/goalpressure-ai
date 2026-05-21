import AppShell from "@/components/layout/AppShell";
import CommandCenter from "@/components/command/CommandCenter";

export default function OpsPage() {
  return (
    <AppShell
      title="Command Center"
      subtitle="Institutional live intelligence"
    >
      <CommandCenter />
    </AppShell>
  );
}
