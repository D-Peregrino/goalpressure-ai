import AppShell from "@/components/layout/AppShell";
import MatchIntelView from "@/components/match/MatchIntelView";

export default async function LiveMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const decoded = decodeURIComponent(matchId);

  return (
    <AppShell subtitle="Match intelligence">
      <MatchIntelView matchId={decoded} />
    </AppShell>
  );
}
