import { redirect } from "next/navigation";

/** Compat: /live/sm-123 → /match/123 */
export default async function LiveMatchRedirect({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const fixtureId = decodeURIComponent(matchId).replace(/^sm-/, "");
  redirect(`/match/${encodeURIComponent(fixtureId)}`);
}
