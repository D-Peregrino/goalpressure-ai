/**
 * Estatísticas do terminal — type_id oficial SportMonks, um valor por período, validação cruzada.
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import type { MatchTeamStats, TeamSideStats } from "@/types/domain";
import { fieldForSportmonksTypeId } from "@/lib/terminal/sportmonksStatMap";

export interface SportmonksStatisticRow {
  id?: number;
  fixture_id?: number;
  type_id?: number;
  participant_id?: number;
  value?: number | string | null;
  location?: string | null;
  period?: number | string | { id?: number; name?: string; description?: string } | null;
  period_id?: number | null;
  type?: {
    id?: number;
    name?: string;
    code?: string;
    developer_name?: string;
  };
  data?: {
    value?: number | string | null;
  };
}

export type ValidatedStatField =
  | "possession"
  | "shots"
  | "shotsOnTarget"
  | "dangerousAttacks"
  | "corners"
  | "yellowCards"
  | "redCards";

export interface ValidatedSideStats {
  possession?: number;
  shots?: number;
  shotsOnTarget?: number;
  dangerousAttacks?: number;
  corners?: number;
  yellowCards?: number;
  redCards?: number;
}

export interface ValidatedTeamStats {
  home: ValidatedSideStats;
  away: ValidatedSideStats;
}

export interface ParsedTeamStats {
  home: TeamSideStats & { yellowCards?: number; redCards?: number };
  away: TeamSideStats & { yellowCards?: number; redCards?: number };
}

export interface SafeTerminalStatsResult {
  teamStats: ValidatedTeamStats | null;
  hasAny: boolean;
  totalShots: number | null;
  totalShotsOnTarget: number | null;
  totalDangerousAttacks: number | null;
  totalCorners: number | null;
  possessionHome: number | null;
}

export interface StatConsistencyResult {
  consistent: boolean;
  blockedFields: Set<ValidatedStatField>;
}

const LIMITS = {
  possessionSumMin: 98,
  possessionSumMax: 102,
  shotsPerTeam: 60,
  shotsTotal: 80,
  cornersPerTeam: 25,
  cornersTotal: 25,
  dangerousPerTeam: 150,
  redCardsTotal: 3,
  yellowCardsPerTeam: 20,
} as const;

type SideKey = "home" | "away";
type PeriodTier = 0 | 1 | 2;

function safeNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const p = Number.parseFloat(value);
    if (Number.isFinite(p)) return p;
  }
  return null;
}

function extractValue(stat: SportmonksStatisticRow): number | null {
  const raw = stat.data?.value ?? stat.value;
  const n = safeNum(raw);
  if (n == null || n < 0) return null;
  return n;
}

function periodLabel(stat: SportmonksStatisticRow): string {
  const parts: string[] = [];
  const p = stat.period;
  if (p != null && typeof p === "object") {
    if (p.name) parts.push(p.name);
    if (p.description) parts.push(p.description);
    if (p.id != null) parts.push(String(p.id));
  } else if (p != null) {
    parts.push(String(p));
  }
  if (stat.period_id != null) parts.push(String(stat.period_id));
  if (stat.location) parts.push(String(stat.location));
  return parts.join(" ").toUpperCase();
}

/** 0 = FULLTIME, 1 = CURRENT, 2 = demais (HT etc.) */
function periodTier(stat: SportmonksStatisticRow): PeriodTier {
  const label = periodLabel(stat);
  if (
    label.includes("FULL") ||
    label.includes("FT") ||
    label.includes("FULLTIME") ||
    label.includes("FULL_TIME")
  ) {
    return 0;
  }
  if (label.includes("CURRENT") || label.includes("LIVE")) {
    return 1;
  }
  return 2;
}

function resolveParticipants(fixture: SportmonksFixture): {
  homeId?: number;
  awayId?: number;
} {
  const parts = fixture.participants ?? [];
  let homeId: number | undefined;
  let awayId: number | undefined;
  for (const p of parts) {
    if (p.meta?.location === "home" && p.id != null) homeId = p.id;
    if (p.meta?.location === "away" && p.id != null) awayId = p.id;
  }
  if (homeId == null && parts[0]?.id != null) homeId = parts[0].id;
  if (awayId == null && parts[1]?.id != null) awayId = parts[1].id;
  return { homeId, awayId };
}

function resolveSide(
  stat: SportmonksStatisticRow,
  homeId?: number,
  awayId?: number
): SideKey | null {
  const pid = stat.participant_id;
  const loc = (stat.location ?? "").toLowerCase();
  if (pid === homeId || loc === "home") return "home";
  if (pid === awayId || loc === "away") return "away";
  return null;
}

function emptyParsedSide(): ParsedTeamStats["home"] {
  return {
    shots: 0,
    shotsOnTarget: 0,
    dangerousAttacks: 0,
    totalAttacks: 0,
    corners: 0,
  };
}

function applyField(
  side: ParsedTeamStats["home"],
  field: ValidatedStatField,
  value: number
): void {
  switch (field) {
    case "shots":
      side.shots = Math.round(value);
      break;
    case "shotsOnTarget":
      side.shotsOnTarget = Math.round(value);
      break;
    case "dangerousAttacks":
      side.dangerousAttacks = Math.round(value);
      break;
    case "corners":
      side.corners = Math.round(value);
      break;
    case "possession":
      side.possession = Math.round(value * 10) / 10;
      break;
    case "yellowCards":
      side.yellowCards = Math.round(value);
      break;
    case "redCards":
      side.redCards = Math.round(value);
      break;
    default:
      break;
  }
}

function pickSinglePeriodRow(rows: SportmonksStatisticRow[]): SportmonksStatisticRow | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort((a, b) => {
    const ta = periodTier(a);
    const tb = periodTier(b);
    if (ta !== tb) return ta - tb;
    return (b.id ?? 0) - (a.id ?? 0);
  });
  return sorted[0] ?? null;
}

/**
 * Parse por type_id oficial — uma linha por (lado, métrica) após prioridade de período.
 */
export function parseSportMonksStats(fixture: SportmonksFixture): ParsedTeamStats | null {
  const statistics = (fixture.statistics ?? []) as SportmonksStatisticRow[];
  if (statistics.length === 0) return null;

  const { homeId, awayId } = resolveParticipants(fixture);
  if (homeId == null && awayId == null) return null;

  /** Uma fila por (lado, type_id) — evita somar FT+HT; red 83+85 somam depois. */
  const buckets = new Map<string, SportmonksStatisticRow[]>();

  for (const stat of statistics) {
    if (!fieldForSportmonksTypeId(stat.type_id)) continue;

    const side = resolveSide(stat, homeId, awayId);
    if (!side) continue;

    const key = `${side}|${stat.type_id}`;
    const list = buckets.get(key) ?? [];
    list.push(stat);
    buckets.set(key, list);
  }

  if (buckets.size === 0) return null;

  const home = emptyParsedSide();
  const away = emptyParsedSide();
  const accum = new Map<string, number>();

  for (const [key, rows] of buckets) {
    const [side, typeIdStr] = key.split("|");
    const typeId = Number(typeIdStr);
    const field = fieldForSportmonksTypeId(typeId);
    if (!field) continue;

    const picked = pickSinglePeriodRow(rows);
    if (!picked) continue;
    const value = extractValue(picked);
    if (value == null) continue;

    const accKey = `${side}|${field}`;
    if (field === "redCards") {
      accum.set(accKey, (accum.get(accKey) ?? 0) + value);
    } else {
      accum.set(accKey, value);
    }
  }

  for (const [accKey, value] of accum) {
    const [side, field] = accKey.split("|") as [SideKey, ValidatedStatField];
    applyField(side === "home" ? home : away, field, value);
  }

  return { home, away };
}

function stripPerSideLimits(side: ValidatedSideStats): ValidatedSideStats {
  const out: ValidatedSideStats = {};

  if (side.shots != null && side.shots >= 0 && side.shots <= LIMITS.shotsPerTeam) {
    out.shots = side.shots;
  }
  if (side.shotsOnTarget != null) {
    const maxShots = out.shots ?? side.shots;
    if (
      side.shotsOnTarget >= 0 &&
      side.shotsOnTarget <= LIMITS.shotsPerTeam &&
      (maxShots == null || side.shotsOnTarget <= maxShots)
    ) {
      out.shotsOnTarget = side.shotsOnTarget;
    }
  }
  if (
    side.dangerousAttacks != null &&
    side.dangerousAttacks >= 0 &&
    side.dangerousAttacks <= LIMITS.dangerousPerTeam
  ) {
    out.dangerousAttacks = side.dangerousAttacks;
  }
  if (side.corners != null && side.corners >= 0 && side.corners <= LIMITS.cornersPerTeam) {
    out.corners = side.corners;
  }
  if (
    side.yellowCards != null &&
    side.yellowCards >= 0 &&
    side.yellowCards <= LIMITS.yellowCardsPerTeam
  ) {
    out.yellowCards = side.yellowCards;
  }
  if (side.redCards != null && side.redCards >= 0 && side.redCards <= 2) {
    out.redCards = side.redCards;
  }
  if (side.possession != null && side.possession >= 0 && side.possession <= 100) {
    out.possession = side.possession;
  }

  return out;
}

/** Validação cruzada — remove métricas suspeitas. */
export function validateStatConsistency(
  stats: ValidatedTeamStats
): StatConsistencyResult {
  const blocked = new Set<ValidatedStatField>();
  const h = stats.home;
  const a = stats.away;

  const shotsTotal = (h.shots ?? 0) + (a.shots ?? 0);
  const sotTotal = (h.shotsOnTarget ?? 0) + (a.shotsOnTarget ?? 0);
  const daTotal = (h.dangerousAttacks ?? 0) + (a.dangerousAttacks ?? 0);
  const cornersTotal = (h.corners ?? 0) + (a.corners ?? 0);
  const redTotal = (h.redCards ?? 0) + (a.redCards ?? 0);
  const yellowTotal = (h.yellowCards ?? 0) + (a.yellowCards ?? 0);

  if (redTotal > LIMITS.redCardsTotal) {
    blocked.add("redCards");
  }

  if (cornersTotal > LIMITS.cornersTotal) {
    blocked.add("corners");
  }

  if (shotsTotal > 20 && daTotal < 5) {
    blocked.add("dangerousAttacks");
    if (daTotal === 0 && shotsTotal > 25) {
      blocked.add("shots");
      blocked.add("shotsOnTarget");
    }
  }

  if (cornersTotal > 0 && shotsTotal > 0 && cornersTotal > shotsTotal) {
    blocked.add("corners");
  }

  if (redTotal > yellowTotal + 2 && yellowTotal >= 0) {
    blocked.add("redCards");
  }

  for (const side of [h, a] as const) {
    if (
      side.shots != null &&
      side.shotsOnTarget != null &&
      side.shotsOnTarget > side.shots
    ) {
      blocked.add("shotsOnTarget");
      blocked.add("shots");
    }
    if (
      side.shots != null &&
      side.shots >= 15 &&
      (side.dangerousAttacks ?? 0) < 3
    ) {
      blocked.add("dangerousAttacks");
    }
  }

  return { consistent: blocked.size === 0, blockedFields: blocked };
}

function applyBlockedFields(
  stats: ValidatedTeamStats,
  blocked: Set<ValidatedStatField>
): ValidatedTeamStats {
  if (blocked.size === 0) return stats;

  const strip = (side: ValidatedSideStats): ValidatedSideStats => {
    const out = { ...side };
    for (const f of blocked) {
      delete out[f];
    }
    return out;
  };

  return { home: strip(stats.home), away: strip(stats.away) };
}

export function validateMatchStats(parsed: ParsedTeamStats | null): ValidatedTeamStats | null {
  if (!parsed) return null;

  const homePoss = parsed.home.possession;
  const awayPoss = parsed.away.possession;
  const possessionSum = (homePoss ?? 0) + (awayPoss ?? 0);
  const validPossession =
    homePoss != null &&
    awayPoss != null &&
    homePoss >= 0 &&
    awayPoss <= 100 &&
    awayPoss >= 0 &&
    awayPoss <= 100 &&
    possessionSum >= LIMITS.possessionSumMin &&
    possessionSum <= LIMITS.possessionSumMax;

  const homeRaw: ValidatedSideStats = {
    shots: parsed.home.shots > 0 ? parsed.home.shots : undefined,
    shotsOnTarget: parsed.home.shotsOnTarget > 0 ? parsed.home.shotsOnTarget : undefined,
    dangerousAttacks:
      parsed.home.dangerousAttacks > 0 ? parsed.home.dangerousAttacks : undefined,
    corners: parsed.home.corners > 0 ? parsed.home.corners : undefined,
    yellowCards: parsed.home.yellowCards,
    redCards: parsed.home.redCards,
    possession: validPossession ? Math.round(homePoss!) : undefined,
  };

  const awayRaw: ValidatedSideStats = {
    shots: parsed.away.shots > 0 ? parsed.away.shots : undefined,
    shotsOnTarget: parsed.away.shotsOnTarget > 0 ? parsed.away.shotsOnTarget : undefined,
    dangerousAttacks:
      parsed.away.dangerousAttacks > 0 ? parsed.away.dangerousAttacks : undefined,
    corners: parsed.away.corners > 0 ? parsed.away.corners : undefined,
    yellowCards: parsed.away.yellowCards,
    redCards: parsed.away.redCards,
    possession: validPossession ? Math.round(awayPoss!) : undefined,
  };

  let home = stripPerSideLimits(homeRaw);
  let away = stripPerSideLimits(awayRaw);

  const totalShots = (home.shots ?? 0) + (away.shots ?? 0);
  if (totalShots > LIMITS.shotsTotal) {
    home = { ...home, shots: undefined, shotsOnTarget: undefined };
    away = { ...away, shots: undefined, shotsOnTarget: undefined };
  }

  let merged: ValidatedTeamStats = { home, away };
  const consistency = validateStatConsistency(merged);
  merged = applyBlockedFields(merged, consistency.blockedFields);

  const hasAny =
    Object.keys(merged.home).length > 0 || Object.keys(merged.away).length > 0;
  if (!hasAny) return null;

  return merged;
}

export function validatedToMatchTeamStats(
  validated: ValidatedTeamStats
): MatchTeamStats {
  const toSide = (s: ValidatedSideStats): TeamSideStats => ({
    shots: s.shots ?? 0,
    shotsOnTarget: s.shotsOnTarget ?? 0,
    dangerousAttacks: s.dangerousAttacks ?? 0,
    totalAttacks: 0,
    corners: s.corners ?? 0,
    possession: s.possession,
  });
  return { home: toSide(validated.home), away: toSide(validated.away) };
}

function parsedFromMatchTeamStats(teamStats: MatchTeamStats): ParsedTeamStats {
  return {
    home: {
      ...emptyParsedSide(),
      shots: teamStats.home.shots,
      shotsOnTarget: teamStats.home.shotsOnTarget,
      dangerousAttacks: teamStats.home.dangerousAttacks,
      corners: teamStats.home.corners,
      possession: teamStats.home.possession,
    },
    away: {
      ...emptyParsedSide(),
      shots: teamStats.away.shots,
      shotsOnTarget: teamStats.away.shotsOnTarget,
      dangerousAttacks: teamStats.away.dangerousAttacks,
      corners: teamStats.away.corners,
      possession: teamStats.away.possession,
    },
  };
}

export function getSafeTerminalStats(input: {
  fixture?: SportmonksFixture;
  teamStats?: MatchTeamStats | null;
}): SafeTerminalStatsResult {
  const empty: SafeTerminalStatsResult = {
    teamStats: null,
    hasAny: false,
    totalShots: null,
    totalShotsOnTarget: null,
    totalDangerousAttacks: null,
    totalCorners: null,
    possessionHome: null,
  };

  const validated = input.fixture
    ? validateMatchStats(parseSportMonksStats(input.fixture))
    : input.teamStats
      ? validateMatchStats(parsedFromMatchTeamStats(input.teamStats))
      : null;

  if (!validated) return empty;

  const h = validated.home;
  const a = validated.away;

  const totalShots =
    h.shots != null && a.shots != null ? h.shots + a.shots : h.shots ?? a.shots ?? null;

  const totalShotsOnTarget =
    h.shotsOnTarget != null && a.shotsOnTarget != null
      ? h.shotsOnTarget + a.shotsOnTarget
      : h.shotsOnTarget ?? a.shotsOnTarget ?? null;

  const totalDangerousAttacks =
    h.dangerousAttacks != null && a.dangerousAttacks != null
      ? h.dangerousAttacks + a.dangerousAttacks
      : h.dangerousAttacks ?? a.dangerousAttacks ?? null;

  const totalCorners =
    h.corners != null && a.corners != null
      ? h.corners + a.corners
      : h.corners ?? a.corners ?? null;

  return {
    teamStats: validated,
    hasAny: true,
    totalShots,
    totalShotsOnTarget,
    totalDangerousAttacks,
    totalCorners,
    possessionHome: h.possession ?? null,
  };
}

/** Log temporário — dev only, prefixo [terminal-stat-debug]. */
export function logTerminalStatsAuditDev(fixture: SportmonksFixture, fixtureId?: string): void {
  if (process.env.NODE_ENV === "production") return;

  const statistics = (fixture.statistics ?? []) as SportmonksStatisticRow[];
  const rows = statistics.map((s) => ({
    type_id: s.type_id,
    type_name: s.type?.name ?? null,
    developer_name: s.type?.developer_name ?? null,
    value: s.data?.value ?? s.value ?? null,
    participant_id: s.participant_id,
    location: s.location ?? null,
    period: s.period ?? s.period_id ?? null,
    mapped_field: fieldForSportmonksTypeId(s.type_id),
  }));

  console.info("[terminal-stat-debug]", {
    fixtureId: fixtureId ?? fixture.id,
    count: rows.length,
    statistics: rows,
    parsed: parseSportMonksStats(fixture),
    validated: validateMatchStats(parseSportMonksStats(fixture)),
  });
}
