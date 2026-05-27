/**
 * Estatísticas do terminal — somente tipos SportMonks reconhecidos + validação matemática.
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import type { MatchStats, MatchTeamStats, TeamSideStats } from "@/types/domain";
import { logInfo } from "@/lib/utils/logger";

export interface SportmonksStatisticRow {
  id?: number;
  fixture_id?: number;
  type_id?: number;
  participant_id?: number;
  value?: number | string | null;
  location?: string | null;
  period?: number | string | null;
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
  home: TeamSideStats;
  away: TeamSideStats;
}

export interface SafeTerminalStatsResult {
  teamStats: ValidatedTeamStats | null;
  hasAny: boolean;
  totalShots: number | null;
  totalShotsOnTarget: number | null;
  totalDangerousAttacks: number | null;
  totalCorners: number | null;
  /** Posse do mandante (%) — só quando par casa/visitante valida 98–102. */
  possessionHome: number | null;
}

const ALLOWED_TYPE_ID: Record<number, ValidatedStatField> = {
  34: "corners",
  42: "shots",
  45: "possession",
  47: "dangerousAttacks",
  52: "dangerousAttacks",
  58: "corners",
  78: "dangerousAttacks",
  84: "corners",
  86: "shotsOnTarget",
  83: "yellowCards",
  87: "redCards",
};

const ALLOWED_TYPE_NAMES: Record<string, ValidatedStatField> = {
  ballpossession: "possession",
  ball_possession: "possession",
  shotstotal: "shots",
  shots_total: "shots",
  shotsontarget: "shotsOnTarget",
  shots_on_target: "shotsOnTarget",
  dangerousattacks: "dangerousAttacks",
  dangerous_attacks: "dangerousAttacks",
  corners: "corners",
  corner: "corners",
  yellowcards: "yellowCards",
  yellowcard: "yellowCards",
  yellow_cards: "yellowCards",
  redcards: "redCards",
  redcard: "redCards",
  red_cards: "redCards",
};

const LIMITS = {
  possessionSumMin: 98,
  possessionSumMax: 102,
  shotsPerTeam: 60,
  shotsTotal: 80,
  cornersPerTeam: 30,
  dangerousPerTeam: 150,
} as const;

function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

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

function resolveAllowedField(stat: SportmonksStatisticRow): ValidatedStatField | null {
  if (stat.type_id != null && ALLOWED_TYPE_ID[stat.type_id]) {
    return ALLOWED_TYPE_ID[stat.type_id]!;
  }

  const candidates = [
    stat.type?.developer_name,
    stat.type?.code,
    stat.type?.name,
  ].filter((v): v is string => typeof v === "string" && v.trim().length > 0);

  for (const raw of candidates) {
    const key = normalizeKey(raw);
    if (ALLOWED_TYPE_NAMES[key]) return ALLOWED_TYPE_NAMES[key]!;
    const compact = key.replace(/_/g, "");
    if (ALLOWED_TYPE_NAMES[compact]) return ALLOWED_TYPE_NAMES[compact]!;
  }

  return null;
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

function emptyParsedSide(): TeamSideStats {
  return {
    shots: 0,
    shotsOnTarget: 0,
    dangerousAttacks: 0,
    totalAttacks: 0,
    corners: 0,
  };
}

function setParsedSide(
  side: TeamSideStats,
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
      (side as TeamSideStats & { yellowCards?: number }).yellowCards = Math.round(value);
      break;
    case "redCards":
      (side as TeamSideStats & { redCards?: number }).redCards = Math.round(value);
      break;
    default:
      break;
  }
}

/** Parse bruto — allowlist apenas; atribuição por participante (sem somar duplicatas). */
export function parseSportMonksStats(fixture: SportmonksFixture): ParsedTeamStats | null {
  const statistics = (fixture.statistics ?? []) as SportmonksStatisticRow[];
  if (statistics.length === 0) return null;

  const { homeId, awayId } = resolveParticipants(fixture);
  if (homeId == null && awayId == null) return null;

  const home = emptyParsedSide();
  const away = emptyParsedSide();
  let matched = false;

  for (const stat of statistics) {
    const field = resolveAllowedField(stat);
    if (!field) continue;

    const value = extractValue(stat);
    if (value == null) continue;

    const pid = stat.participant_id;
    const loc = (stat.location ?? "").toLowerCase();

    if (pid === homeId || loc === "home") {
      setParsedSide(home, field, value);
      matched = true;
    } else if (pid === awayId || loc === "away") {
      setParsedSide(away, field, value);
      matched = true;
    }
  }

  if (!matched) return null;
  return { home, away };
}

function stripInvalidSide(side: ValidatedSideStats): ValidatedSideStats {
  const out: ValidatedSideStats = {};

  if (side.shots != null) {
    if (side.shots >= 0 && side.shots <= LIMITS.shotsPerTeam) out.shots = side.shots;
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
  if (side.dangerousAttacks != null) {
    if (side.dangerousAttacks >= 0 && side.dangerousAttacks <= LIMITS.dangerousPerTeam) {
      out.dangerousAttacks = side.dangerousAttacks;
    }
  }
  if (side.corners != null) {
    if (side.corners >= 0 && side.corners <= LIMITS.cornersPerTeam) out.corners = side.corners;
  }
  if (side.yellowCards != null && side.yellowCards >= 0 && side.yellowCards <= 20) {
    out.yellowCards = side.yellowCards;
  }
  if (side.redCards != null && side.redCards >= 0 && side.redCards <= 10) {
    out.redCards = side.redCards;
  }

  return out;
}

export function validateMatchStats(parsed: ParsedTeamStats | null): ValidatedTeamStats | null {
  if (!parsed) return null;

  let homePoss = parsed.home.possession;
  let awayPoss = parsed.away.possession;
  const possessionOk =
    homePoss != null &&
    awayPoss != null &&
    homePoss >= 0 &&
    awayPoss >= 0 &&
    homePoss <= 100 &&
    awayPoss <= 100;
  const possessionSum = (homePoss ?? 0) + (awayPoss ?? 0);
  const validPossession =
    possessionOk &&
    possessionSum >= LIMITS.possessionSumMin &&
    possessionSum <= LIMITS.possessionSumMax;

  const homeRaw: ValidatedSideStats = {
    shots: parsed.home.shots > 0 ? parsed.home.shots : undefined,
    shotsOnTarget: parsed.home.shotsOnTarget > 0 ? parsed.home.shotsOnTarget : undefined,
    dangerousAttacks:
      parsed.home.dangerousAttacks > 0 ? parsed.home.dangerousAttacks : undefined,
    corners: parsed.home.corners > 0 ? parsed.home.corners : undefined,
    yellowCards: (parsed.home as TeamSideStats & { yellowCards?: number }).yellowCards,
    redCards: (parsed.home as TeamSideStats & { redCards?: number }).redCards,
    possession: validPossession ? Math.round(homePoss!) : undefined,
  };

  const awayRaw: ValidatedSideStats = {
    shots: parsed.away.shots > 0 ? parsed.away.shots : undefined,
    shotsOnTarget: parsed.away.shotsOnTarget > 0 ? parsed.away.shotsOnTarget : undefined,
    dangerousAttacks:
      parsed.away.dangerousAttacks > 0 ? parsed.away.dangerousAttacks : undefined,
    corners: parsed.away.corners > 0 ? parsed.away.corners : undefined,
    yellowCards: (parsed.away as TeamSideStats & { yellowCards?: number }).yellowCards,
    redCards: (parsed.away as TeamSideStats & { redCards?: number }).redCards,
    possession: validPossession ? Math.round(awayPoss!) : undefined,
  };

  const home = stripInvalidSide(homeRaw);
  const away = stripInvalidSide(awayRaw);

  const totalShots = (home.shots ?? 0) + (away.shots ?? 0);
  if (totalShots > LIMITS.shotsTotal) {
    delete home.shots;
    delete away.shots;
    delete home.shotsOnTarget;
    delete away.shotsOnTarget;
  }

  const hasAny =
    Object.keys(home).length > 0 || Object.keys(away).length > 0;
  if (!hasAny) return null;

  return { home, away };
}

function validatedFromLegacyTeamStats(
  teamStats: MatchTeamStats | undefined
): ValidatedTeamStats | null {
  if (!teamStats) return null;

  const parsed: ParsedTeamStats = {
    home: { ...emptyParsedSide(), ...teamStats.home },
    away: { ...emptyParsedSide(), ...teamStats.away },
  };

  return validateMatchStats(parsed);
}

export function getSafeTerminalStats(input: {
  fixture?: SportmonksFixture;
  teamStats?: MatchTeamStats | null;
  stats?: MatchStats | null;
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

  const validated =
    (input.fixture ? validateMatchStats(parseSportMonksStats(input.fixture)) : null) ??
    validatedFromLegacyTeamStats(input.teamStats ?? undefined);

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

/** Log de auditoria — apenas em desenvolvimento. */
export function logTerminalStatsAuditDev(fixture: SportmonksFixture, fixtureId?: string): void {
  if (process.env.NODE_ENV === "production") return;

  const statistics = (fixture.statistics ?? []) as SportmonksStatisticRow[];
  const rows = statistics.map((s) => ({
    type_id: s.type_id,
    type_name: s.type?.name ?? null,
    developer_name: s.type?.developer_name ?? null,
    participant_id: s.participant_id,
    location: s.location ?? null,
    period: s.period ?? s.period_id ?? null,
    value: s.data?.value ?? s.value ?? null,
  }));

  logInfo("terminal-stats-audit", "SportMonks statistics payload", {
    fixtureId: fixtureId ?? fixture.id,
    count: rows.length,
    rows: rows.slice(0, 80),
  });
}
