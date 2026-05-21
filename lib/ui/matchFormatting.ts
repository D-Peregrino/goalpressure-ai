import type { Match, MatchStatus } from "@/types/domain";

export function normalizeFixtureId(id: string): string {
  return id.replace(/^sm-/, "");
}

export function fixtureIdFromMatch(match: Match): string {
  if (match.externalId) return String(match.externalId);
  return normalizeFixtureId(match.id);
}

export type DisplayMatchStatus = "LIVE" | "HT" | "FT" | "PRE" | "POST" | "—";

export function toDisplayStatus(status?: MatchStatus): DisplayMatchStatus {
  switch (status) {
    case "LIVE":
      return "LIVE";
    case "HALFTIME":
      return "HT";
    case "FINISHED":
      return "FT";
    case "NOT_STARTED":
      return "PRE";
    case "POSTPONED":
    case "CANCELLED":
      return "POST";
    default:
      return "—";
  }
}

export function formatMinute(minute: number, status?: MatchStatus): string {
  const display = toDisplayStatus(status);
  if (display === "HT") return "HT";
  if (display === "FT") return "FT";
  if (display === "PRE") return "—";
  if (minute <= 0) return "—";
  if (minute > 90) return `${minute}'+`;
  return `${minute}'`;
}

/** @deprecated Prefer formatScoreDisplay from normalizeLiveMatch */
export function formatScore(
  score?: { home: number; away: number } | null
): { home: string; away: string } {
  if (!score) return { home: "—", away: "—" };
  return { home: String(score.home), away: String(score.away) };
}

export { formatScoreDisplay, formatMinuteLabel } from "@/lib/ui/normalizeLiveMatch";

export function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, n));
}
