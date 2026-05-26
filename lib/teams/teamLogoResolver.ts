import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { getTeamColor, getTeamInitials, getTeamTextOnColor } from "@/lib/ui/teamColors";
import type { Match } from "@/types/domain";

export type TeamSide = "home" | "away";

const SPORTMONKS_CDN = "https://cdn.sportmonks.com";
const logoUrlCache = new Map<string, string>();

export interface TeamLogoFallback {
  initials: string;
  background: string;
  color: string;
}

function cacheKey(teamName: string, url: string): string {
  return `${teamName.trim().toLowerCase()}|${url}`;
}

/** Normaliza URL de escudo (CDN SportMonks, absoluta ou protocol-relative). */
export function normalizeLogoUrl(url: string | null | undefined): string | null {
  if (url == null || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    return `${SPORTMONKS_CDN}${trimmed}`;
  }
  if (trimmed.includes("sportmonks") || trimmed.includes(".png") || trimmed.includes(".svg")) {
    return trimmed.startsWith("http") ? trimmed : `${SPORTMONKS_CDN}/${trimmed.replace(/^\//, "")}`;
  }
  return null;
}

export function extractParticipantLogo(participant: Record<string, unknown>): string | null {
  const img =
    participant.image_path ??
    participant.logo_path ??
    participant.logo ??
    participant.image ??
    null;
  if (typeof img !== "string") return null;
  return normalizeLogoUrl(img);
}

export function extractLogosFromRaw(raw: unknown): {
  homeLogo: string | null;
  awayLogo: string | null;
} {
  if (!raw || typeof raw !== "object") {
    return { homeLogo: null, awayLogo: null };
  }

  const participants = (raw as Record<string, unknown>).participants;
  if (!Array.isArray(participants)) {
    return { homeLogo: null, awayLogo: null };
  }

  let homeLogo: string | null = null;
  let awayLogo: string | null = null;

  for (const p of participants) {
    if (!p || typeof p !== "object") continue;
    const part = p as Record<string, unknown>;
    const meta = part.meta as Record<string, unknown> | undefined;
    const url = extractParticipantLogo(part);
    if (!url) continue;
    if (meta?.location === "home") homeLogo = url;
    if (meta?.location === "away") awayLogo = url;
  }

  return { homeLogo, awayLogo };
}

export function resolveFallbackLogo(teamName: string): TeamLogoFallback {
  return {
    initials: getTeamInitials(teamName),
    background: getTeamColor(teamName),
    color: getTeamTextOnColor(teamName),
  };
}

export function getCachedLogoUrl(teamName: string, url: string): string {
  const normalized = normalizeLogoUrl(url);
  if (!normalized) return url;
  const key = cacheKey(teamName, normalized);
  const hit = logoUrlCache.get(key);
  if (hit) return hit;
  logoUrlCache.set(key, normalized);
  if (logoUrlCache.size > 400) {
    const first = logoUrlCache.keys().next().value;
    if (first) logoUrlCache.delete(first);
  }
  return normalized;
}

export function resolveTeamLogoFromMatch(
  match: Match,
  side: TeamSide
): string | null {
  const direct =
    side === "home" ? match.homeLogoUrl ?? null : match.awayLogoUrl ?? null;
  if (direct) return getCachedLogoUrl(side === "home" ? match.homeTeam : match.awayTeam, direct);

  const meta = match.feedMeta?.participantLogos;
  if (meta) {
    const fromMeta = side === "home" ? meta.home : meta.away;
    if (fromMeta) {
      return getCachedLogoUrl(
        side === "home" ? match.homeTeam : match.awayTeam,
        fromMeta
      );
    }
  }

  return null;
}

export function resolveTeamLogoFromEnriched(
  match: EnrichedLiveMatch,
  side: TeamSide
): string | null {
  const explicit = side === "home" ? match.homeLogo : match.awayLogo;
  const teamName = side === "home" ? match.homeTeam : match.awayTeam;
  if (explicit) return getCachedLogoUrl(teamName, explicit);
  return null;
}

export function resolveTeamLogo(params: {
  side: TeamSide;
  teamName: string;
  match?: Match | null;
  enriched?: EnrichedLiveMatch | null;
  explicitUrl?: string | null;
  raw?: unknown;
}): string | null {
  if (params.explicitUrl) {
    return getCachedLogoUrl(params.teamName, params.explicitUrl);
  }
  if (params.enriched) {
    const fromEnriched = resolveTeamLogoFromEnriched(params.enriched, params.side);
    if (fromEnriched) return fromEnriched;
  }
  if (params.match) {
    const fromMatch = resolveTeamLogoFromMatch(params.match, params.side);
    if (fromMatch) return fromMatch;
  }
  if (params.raw) {
    const { homeLogo, awayLogo } = extractLogosFromRaw(params.raw);
    const url = params.side === "home" ? homeLogo : awayLogo;
    if (url) return getCachedLogoUrl(params.teamName, url);
  }
  return null;
}
