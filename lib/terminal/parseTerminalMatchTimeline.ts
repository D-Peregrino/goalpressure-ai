/**
 * Timeline rica para o modal do terminal — eventos reais SportMonks.
 */

import type { SportmonksFixture } from "@/lib/mappers/sportmonks";
import {
  getFixtureEvents,
  type SportmonksEvent,
} from "@/lib/mappers/sportmonksPremium";
import {
  getFixtureTimelineEntries,
  type SportmonksTimelineEntry,
} from "@/lib/mappers/sportmonksFeedExtensions";
import { terminalEventLabel } from "@/lib/terminal/terminalEventLabel";

export interface TerminalTimelineEvent {
  minute: number;
  extraMinute: number | null;
  label: string;
  teamName: string | null;
  playerName: string | null;
  relatedPlayerName: string | null;
  displayLine: string;
  sortKey: number;
}

type RawEvent = (SportmonksEvent | SportmonksTimelineEntry) & {
  player_name?: string | null;
  related_player_name?: string | null;
  player?: { name?: string; display_name?: string } | null;
  related_player?: { name?: string; display_name?: string } | null;
};

function safeNum(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const p = Number.parseFloat(v);
    if (Number.isFinite(p)) return p;
  }
  return fallback;
}

function pickName(...values: unknown[]): string | null {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const o = v as { name?: string; display_name?: string };
      const n = o.display_name ?? o.name;
      if (typeof n === "string" && n.trim()) return n.trim();
    }
  }
  return null;
}

function resolveTeamName(
  participantId: number | undefined,
  homeId: number | undefined,
  awayId: number | undefined,
  homeTeam: string,
  awayTeam: string
): string | null {
  if (participantId == null) return null;
  if (homeId != null && participantId === homeId) return homeTeam;
  if (awayId != null && participantId === awayId) return awayTeam;
  return null;
}

function formatMinute(minute: number, extraMinute: number | null): string {
  if (extraMinute != null && extraMinute > 0) {
    return `${minute}+${extraMinute}'`;
  }
  return `${minute}'`;
}

function buildPlayerFragment(
  label: string,
  playerName: string | null,
  relatedPlayerName: string | null
): string | null {
  if (label === "Substituição") {
    if (playerName && relatedPlayerName) {
      return `entrou ${playerName} / saiu ${relatedPlayerName}`;
    }
    if (playerName) return `entrou ${playerName}`;
    if (relatedPlayerName) return `saiu ${relatedPlayerName}`;
    return null;
  }
  return playerName;
}

function buildDisplayLine(
  minute: number,
  extraMinute: number | null,
  label: string,
  teamName: string | null,
  playerName: string | null,
  relatedPlayerName: string | null
): string {
  const head = `${formatMinute(minute, extraMinute)} ${label}`;
  const playerPart = buildPlayerFragment(label, playerName, relatedPlayerName);
  const segments = [teamName, playerPart].filter((s): s is string => Boolean(s));
  if (segments.length === 0) return head;
  return `${head} — ${segments.join(" — ")}`;
}

function parseRawEvent(
  ev: RawEvent,
  homeId: number | undefined,
  awayId: number | undefined,
  homeTeam: string,
  awayTeam: string
): TerminalTimelineEvent {
  const minute = safeNum(ev.minute, 0);
  const extraRaw = ev.extra_minute;
  const extraMinute =
    extraRaw != null && Number.isFinite(Number(extraRaw)) && Number(extraRaw) > 0
      ? Number(extraRaw)
      : null;

  const label = terminalEventLabel(ev);
  const teamName = resolveTeamName(ev.participant_id, homeId, awayId, homeTeam, awayTeam);
  const playerName = pickName(ev.player_name, ev.player);
  const relatedPlayerName = pickName(ev.related_player_name, ev.related_player);

  return {
    minute,
    extraMinute,
    label,
    teamName,
    playerName,
    relatedPlayerName,
    displayLine: buildDisplayLine(
      minute,
      extraMinute,
      label,
      teamName,
      playerName,
      relatedPlayerName
    ),
    sortKey: minute * 100 + (extraMinute ?? 0),
  };
}

function participantIds(fixture: SportmonksFixture): {
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

export function parseTerminalMatchTimeline(input: {
  fixture: SportmonksFixture;
  homeTeam: string;
  awayTeam: string;
  limit?: number;
}): TerminalTimelineEvent[] {
  const { homeId, awayId } = participantIds(input.fixture);
  const rawEvents: RawEvent[] = [
    ...getFixtureTimelineEntries(input.fixture),
    ...getFixtureEvents(input.fixture),
  ];

  const seen = new Set<string>();
  const parsed: TerminalTimelineEvent[] = [];

  for (const ev of rawEvents) {
    const row = parseRawEvent(ev, homeId, awayId, input.homeTeam, input.awayTeam);
    const dedupeKey = [
      row.minute,
      row.extraMinute ?? "",
      row.label,
      row.teamName ?? "",
      row.playerName ?? "",
      row.relatedPlayerName ?? "",
    ].join("|");
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    parsed.push(row);
  }

  parsed.sort((a, b) => a.sortKey - b.sortKey);

  const cap = input.limit ?? 80;
  return parsed.slice(0, cap);
}
