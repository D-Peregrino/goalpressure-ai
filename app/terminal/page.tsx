import AppShell from "@/components/layout/AppShell";
import LiveCommandCenter from "@/components/terminal/LiveCommandCenter";

export default function TerminalPage() {
  return (
    <AppShell>
      <LiveCommandCenter />
    </AppShell>
  );
}
