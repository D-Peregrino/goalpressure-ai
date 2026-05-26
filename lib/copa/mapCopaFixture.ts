import type { SportmonksFixture, SportmonksTeam } from "@/lib/mappers/sportmonks";
import type { CopaMatch, CopaMatchStatus, CopaTeam } from "@/lib/copa/types";
import { extractParticipantLogo } from "@/lib/teams/teamLogoResolver";

function mapTeam(p: SportmonksTeam, group?: string): CopaTeam {
  return {
    id: String(p.id ?? p.name ?? "unknown"),
    name: p.name ?? "—",
    shortCode: p.short_code ?? undefined,
    logoUrl: extractParticipantLogo(p as unknown as Record<string, unknown>),
    group,
  };
}

function resolveStatus(fixture: SportmonksFixture): CopaMatchStatus {
  const state = (
    fixture.state?.state ??
    fixture.state?.short_name ??
    fixture.state?.name ??
    ""
  ).toLowerCase();

  if (
    state.includes("inplay") ||
    state.includes("live") ||
    state.includes("1st") ||
    state.includes("2nd") ||
    state.includes("ht")
  ) {
    return "live";
  }
  if (state.includes("finished") || state.includes("ft") || state.includes("ended")) {
    return "finished";
  }
  if (state.includes("ns") || state.includes("not") || state.includes("scheduled")) {
    return "scheduled";
  }
  return "unknown";
}

function resolveScores(fixture: SportmonksFixture): {
  home: number | null;
  away: number | null;
} {
  const participants = fixture.participants ?? [];
  const homeId = participants.find((p) => p.meta?.location === "home")?.id;
  const awayId = participants.find((p) => p.meta?.location === "away")?.id;

  let home: number | null = null;
  let away: number | null = null;

  for (const entry of fixture.scores ?? []) {
    const goals = entry.score?.goals;
    if (typeof goals !== "number") continue;
    const desc = (entry.description ?? "").toLowerCase();
    if (!desc.includes("current") && !desc.includes("2nd") && !desc.includes("ft")) {
      continue;
    }
    if (entry.participant_id === homeId) home = goals;
    if (entry.participant_id === awayId) away = goals;
  }

  if (home === null && away === null && fixture.scores?.length) {
    const last = fixture.scores[fixture.scores.length - 1];
    const g = last?.score?.goals;
    if (typeof g === "number" && last?.participant_id === homeId) home = g;
    if (typeof g === "number" && last?.participant_id === awayId) away = g;
  }

  return { home, away };
}

function resolveMinute(fixture: SportmonksFixture): number | null {
  const periods = fixture.periods ?? [];
  for (const p of periods) {
    const mins = (p as { minutes?: number }).minutes;
    if (typeof mins === "number" && mins > 0) return mins;
  }
  return null;
}

function formatKickoffLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

export function mapSportmonksFixtureToCopaMatch(
  fixture: SportmonksFixture,
  groupHint?: string
): CopaMatch {
  const participants = fixture.participants ?? [];
  const homeRaw = participants.find((p) => p.meta?.location === "home");
  const awayRaw = participants.find((p) => p.meta?.location === "away");
  const group = groupHint ?? (fixture.group_id != null ? `G${fixture.group_id}` : undefined);
  const status = resolveStatus(fixture);
  const { home: homeScore, away: awayScore } = resolveScores(fixture);
  const kickoffAt =
    fixture.starting_at ??
    (fixture.starting_at_timestamp
      ? new Date(fixture.starting_at_timestamp * 1000).toISOString()
      : new Date().toISOString());

  return {
    fixtureId: String(fixture.id),
    matchId: `sm-${fixture.id}`,
    kickoffAt,
    kickoffLabel: formatKickoffLabel(kickoffAt),
    home: mapTeam(homeRaw ?? participants[0] ?? { name: "Home" }, group),
    away: mapTeam(awayRaw ?? participants[1] ?? { name: "Away" }, group),
    homeScore,
    awayScore,
    minute: resolveMinute(fixture),
    status,
    stage: fixture.league?.name ?? "Copa do Mundo",
    group,
    venue: fixture.venue?.name ?? fixture.venue?.city ?? null,
    isLive: status === "live",
  };
}
