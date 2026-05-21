import AppShell from "@/components/layout/AppShell";
import MatchTerminalView from "@/components/match/MatchTerminalView";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  return (
    <AppShell>
      <MatchTerminalView fixtureId={decodeURIComponent(fixtureId)} />
    </AppShell>
  );
}
