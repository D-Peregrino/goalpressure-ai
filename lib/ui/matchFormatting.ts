import type { Match, MatchStatus } from "@/types/domain";

export function normalizeFixtureId(id: string): string {
  return id.replace(/^sm-/, "");
}

export function fixtureIdFromMatch(match: Match): string {
  if (match.externalId) return String(match.externalId);
  return normalizeFixtureId(match.id);
}

export type DisplayMatchStatus = "LIVE" | "HT" | "FT" | "PRE" | "POST" | "—";

/** Partida ainda não iniciada (pré-jogo). */
export function isPreMatchStatus(
  status?: MatchStatus,
  display?: DisplayMatchStatus
): boolean {
  if (status === "NOT_STARTED") return true;
  if (display === "PRE") return true;
  return false;
}

/** Ao vivo ou intervalo. */
export function isLiveStatus(
  status?: MatchStatus,
  display?: DisplayMatchStatus
): boolean {
  if (display === "LIVE" || display === "HT") return true;
  if (status === "LIVE" || status === "HALFTIME") return true;
  return false;
}

/** Partida encerrada. */
export function isFinishedStatus(
  status?: MatchStatus,
  display?: DisplayMatchStatus
): boolean {
  if (display === "FT" || display === "POST") return true;
  if (
    status === "FINISHED" ||
    status === "CANCELLED" ||
    status === "POSTPONED"
  ) {
    return true;
  }
  return false;
}

/** Visível no filtro «Todos» (inclui pré-jogo e encerradas recentes no cache). */
export function isTerminalVisibleMatch(
  status?: MatchStatus,
  display?: DisplayMatchStatus
): boolean {
  const d = display ?? toDisplayStatus(status);
  if (isLiveStatus(status, d) || isPreMatchStatus(status, d)) return true;
  if (d === "FT" || d === "POST") return true;
  if (d === "—" && status === "UNKNOWN") return true;
  return false;
}

export function formatKickoffLabel(
  startingAt?: string | null,
  startingAtTimestamp?: number | null
): string | null {
  if (startingAtTimestamp != null && startingAtTimestamp > 0) {
    try {
      return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(new Date(startingAtTimestamp * 1000));
    } catch {
      /* fall through */
    }
  }
  if (startingAt && typeof startingAt === "string") {
    const d = new Date(startingAt);
    if (!Number.isNaN(d.getTime())) {
      return new Intl.DateTimeFormat("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      }).format(d);
    }
  }
  return null;
}

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
