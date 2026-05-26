/**
 * Motor de perfil operacional — deriva scores a partir de eventos + workspace.
 * Não importa ContextEngine, PredictiveEngine nem GPI engine.
 */

import type { Match } from "@/types/domain";
import type { AlertHistoryItem } from "@/lib/workspace/operationalTypes";
import type {
  BehaviorEventRecord,
  OperationalProfile,
  OperationalStyle,
  PersonalizedAlert,
  ProfileTraits,
  RecommendedMatch,
  SmartWorkspacePayload,
} from "@/lib/personalization/types";

export interface ProfileEngineInput {
  userId: string;
  events: BehaviorEventRecord[];
  existingProfile: OperationalProfile | null;
  favoriteLeagueIds: number[];
  favoriteTeamIds: number[];
  watchlistFixtureIds: string[];
  favoriteFixtureIds: string[];
  liveMatches: Match[];
  alerts: AlertHistoryItem[];
}

function countByType(events: BehaviorEventRecord[], type: string): number {
  return events.filter((e) => e.eventType === type).length;
}

function aggregateTraits(events: BehaviorEventRecord[]): ProfileTraits {
  const leagueCounts = new Map<number, number>();
  const teamCounts = new Map<number, number>();
  let pressureSum = 0;
  let pressureN = 0;

  for (const e of events) {
    if (e.leagueId != null) {
      leagueCounts.set(e.leagueId, (leagueCounts.get(e.leagueId) ?? 0) + 1);
    }
    if (e.teamId != null) {
      teamCounts.set(e.teamId, (teamCounts.get(e.teamId) ?? 0) + 1);
    }
    const p = e.payload?.pressure;
    if (typeof p === "number") {
      pressureSum += p;
      pressureN += 1;
    }
  }

  const topLeagueIds = [...leagueCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const topTeamIds = [...teamCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([id]) => id);

  return {
    totalEvents: events.length,
    matchViews: countByType(events, "match_view") + countByType(events, "match_expand"),
    watchlistAdds: countByType(events, "watchlist_add"),
    favoriteToggles: countByType(events, "favorite_toggle"),
    terminalSessions: countByType(events, "terminal_open"),
    gpiFocusCount: countByType(events, "gpi_focus"),
    avgPressureViewed: pressureN > 0 ? Math.round(pressureSum / pressureN) : 50,
    topLeagueIds,
    topTeamIds,
  };
}

function deriveStyle(traits: ProfileTraits): OperationalStyle {
  if (traits.terminalSessions >= 8 && traits.matchViews >= 15) return "agressivo";
  if (traits.watchlistAdds >= 5 && traits.matchViews < 10) return "seletivo";
  if (traits.totalEvents < 5) return "institucional";
  return "explorador";
}

function deriveScores(traits: ProfileTraits, style: OperationalStyle): {
  behavioralScore: number;
  liveAffinity: number;
  pressurePreference: number;
  gpiAffinity: number;
  telegramAffinity: number;
} {
  const activity = Math.min(100, traits.totalEvents * 3);
  const liveAffinity = Math.min(
    100,
    40 + traits.terminalSessions * 6 + traits.matchViews * 2
  );
  let pressurePreference = traits.avgPressureViewed;
  if (style === "agressivo") pressurePreference = Math.max(pressurePreference, 68);
  if (style === "seletivo") pressurePreference = Math.min(pressurePreference, 58);
  const gpiAffinity = Math.min(100, 35 + traits.gpiFocusCount * 8 + traits.matchViews);
  const telegramAffinity = Math.min(
    100,
    30 + (style === "agressivo" ? 25 : 10) + traits.watchlistAdds * 4
  );

  const behavioralScore = Math.round(
    (activity + liveAffinity + pressurePreference + gpiAffinity) / 4
  );

  return {
    behavioralScore: Math.min(100, Math.max(10, behavioralScore)),
    liveAffinity: Math.min(100, liveAffinity),
    pressurePreference: Math.min(100, Math.max(20, pressurePreference)),
    gpiAffinity: Math.min(100, gpiAffinity),
    telegramAffinity: Math.min(100, telegramAffinity),
  };
}

export function buildOperationalProfile(input: ProfileEngineInput): OperationalProfile {
  const traits = aggregateTraits(input.events);
  const operationalStyle = deriveStyle(traits);
  const scores = deriveScores(traits, operationalStyle);

  return {
    userId: input.userId,
    ...scores,
    operationalStyle,
    traits,
    updatedAt: new Date().toISOString(),
  };
}

function fixtureIdOf(m: Match): string {
  return String(m.externalId ?? m.id);
}

export function rankMatchesForProfile(
  matches: Match[],
  profile: OperationalProfile,
  ctx: {
    favoriteLeagueIds: number[];
    favoriteTeamIds: number[];
    watchlistIds: Set<string>;
    favoriteFixtureIds: Set<string>;
  }
): RecommendedMatch[] {
  const threshold = profile.pressurePreference - 12;

  return [...matches]
    .map((m) => {
      const fid = fixtureIdOf(m);
      const pressure = Math.round(m.pressure.score);
      let boost = 0;
      const reasons: string[] = [];

      if (ctx.watchlistIds.has(fid)) {
        boost += 28;
        reasons.push("watchlist");
      }
      if (ctx.favoriteFixtureIds.has(fid)) {
        boost += 22;
        reasons.push("favorito");
      }
      if (pressure >= threshold) {
        boost += 15;
        reasons.push("pressão alinhada");
      }
      if (m.status === "LIVE" || m.status === "HALFTIME") {
        boost += profile.liveAffinity / 5;
        reasons.push("ao vivo");
      }
      if (profile.operationalStyle === "agressivo" && pressure >= 70) {
        boost += 10;
        reasons.push("perfil agressivo");
      }
      if (profile.operationalStyle === "seletivo" && pressure >= 55 && pressure <= 75) {
        boost += 8;
        reasons.push("perfil seletivo");
      }

      const personalizedScore = pressure + boost;
      return {
        fixtureId: fid,
        label: `${m.homeTeam} × ${m.awayTeam} · ${m.minute}'`,
        pressureScore: pressure,
        personalizedScore,
        reason: reasons.length ? reasons.join(" · ") : "contexto geral",
        live: m.status === "LIVE" || m.status === "HALFTIME",
      };
    })
    .sort((a, b) => b.personalizedScore - a.personalizedScore)
    .slice(0, 8);
}

export function rankAlertsForProfile(
  alerts: AlertHistoryItem[],
  profile: OperationalProfile
): PersonalizedAlert[] {
  return alerts
    .map((a) => {
      let compatibility = 50;
      const reasons: string[] = [];

      if (a.severity === "high") {
        compatibility += profile.operationalStyle === "agressivo" ? 25 : 10;
        reasons.push("alta intensidade");
      }
      if (a.severity === "medium") {
        compatibility += profile.operationalStyle === "seletivo" ? 20 : 12;
        reasons.push("ritmo moderado");
      }
      if (a.alertType.includes("gpi") || a.message.toLowerCase().includes("gpi")) {
        compatibility += profile.gpiAffinity / 4;
        reasons.push("GPI");
      }
      if (profile.telegramAffinity >= 60) {
        compatibility += 8;
        reasons.push("canal Telegram");
      }

      return {
        id: a.id,
        fixtureId: a.fixtureId,
        matchLabel: a.matchLabel,
        message: a.message,
        severity: a.severity,
        compatibilityScore: Math.min(100, Math.round(compatibility)),
        reason: reasons.join(" · ") || "alerta contextual",
        createdAt: a.createdAt,
      };
    })
    .sort((a, b) => b.compatibilityScore - a.compatibilityScore)
    .slice(0, 8);
}

export function buildSmartWorkspacePayload(input: ProfileEngineInput): SmartWorkspacePayload {
  const profile = buildOperationalProfile(input);
  const watchSet = new Set(input.watchlistFixtureIds);
  const favSet = new Set(input.favoriteFixtureIds);

  const recommendedMatches = rankMatchesForProfile(input.liveMatches, profile, {
    favoriteLeagueIds: input.favoriteLeagueIds,
    favoriteTeamIds: input.favoriteTeamIds,
    watchlistIds: watchSet,
    favoriteFixtureIds: favSet,
  });

  const compatibleAlerts = rankAlertsForProfile(input.alerts, profile);

  let adaptiveFeedPriority: SmartWorkspacePayload["adaptiveFeedPriority"] = "balanced";
  if (profile.operationalStyle === "agressivo") adaptiveFeedPriority = "pressure";
  if (profile.operationalStyle === "seletivo") adaptiveFeedPriority = "favorites";

  return {
    profile,
    recommendedMatches,
    compatibleAlerts,
    adaptiveFeedPriority,
  };
}
