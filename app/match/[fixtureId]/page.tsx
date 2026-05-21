import AppShell from "@/components/layout/AppShell";
import MatchCenterPremium from "@/components/match-center/MatchCenterPremium";

export default async function MatchPage({
  params,
}: {
  params: Promise<{ fixtureId: string }>;
}) {
  const { fixtureId } = await params;
  return (
    <AppShell>
      <MatchCenterPremium fixtureId={decodeURIComponent(fixtureId)} />
    </AppShell>
  );
}
