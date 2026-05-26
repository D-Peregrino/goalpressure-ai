import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { devAuthEnabled } from "@/lib/auth/devStore";
import type {
  BehaviorEventInput,
  BehaviorEventRecord,
  BehaviorEventType,
  OperationalProfile,
} from "@/lib/personalization/types";
import { DEFAULT_PROFILE_TRAITS } from "@/lib/personalization/types";

const EVENT_RETENTION = 200;

declare global {
  // eslint-disable-next-line no-var
  var __GP_BEHAVIOR_DEV__: Map<
    string,
    { events: BehaviorEventRecord[]; profile: OperationalProfile | null }
  > | undefined;
}

function devBucket(userId: string) {
  if (!globalThis.__GP_BEHAVIOR_DEV__) {
    globalThis.__GP_BEHAVIOR_DEV__ = new Map();
  }
  if (!globalThis.__GP_BEHAVIOR_DEV__.has(userId)) {
    globalThis.__GP_BEHAVIOR_DEV__.set(userId, { events: [], profile: null });
  }
  return globalThis.__GP_BEHAVIOR_DEV__.get(userId)!;
}

function rowEvent(r: Record<string, unknown>): BehaviorEventRecord {
  return {
    id: String(r.id),
    eventType: String(r.event_type) as BehaviorEventType,
    fixtureId: (r.fixture_id as string) ?? undefined,
    leagueId: r.league_id != null ? Number(r.league_id) : undefined,
    teamId: r.team_id != null ? Number(r.team_id) : undefined,
    payload: (r.payload as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
  };
}

function rowProfile(userId: string, r: Record<string, unknown>): OperationalProfile {
  const traits = (r.traits as OperationalProfile["traits"]) ?? DEFAULT_PROFILE_TRAITS;
  return {
    userId,
    behavioralScore: Number(r.behavioral_score ?? 50),
    operationalStyle: (r.operational_style as OperationalProfile["operationalStyle"]) ?? "explorador",
    liveAffinity: Number(r.live_affinity ?? 50),
    pressurePreference: Number(r.pressure_preference ?? 55),
    gpiAffinity: Number(r.gpi_affinity ?? 50),
    telegramAffinity: Number(r.telegram_affinity ?? 40),
    traits,
    updatedAt: String(r.updated_at ?? new Date().toISOString()),
  };
}

export async function recordBehaviorEvent(
  userId: string,
  input: BehaviorEventInput
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    user_id: userId,
    event_type: input.eventType,
    fixture_id: input.fixtureId ?? null,
    league_id: input.leagueId ?? null,
    team_id: input.teamId ?? null,
    payload: input.payload ?? {},
  };

  if (devAuthEnabled()) {
    const bucket = devBucket(userId);
    bucket.events.unshift({
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date().toISOString(),
    });
    bucket.events = bucket.events.slice(0, EVENT_RETENTION);
    return { ok: true };
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return { ok: false, error: "behavior_nao_configurado" };
  }

  const { error } = await admin.from("user_behavior_events").insert(payload);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getRecentBehaviorEvents(
  userId: string,
  limit = 120
): Promise<BehaviorEventRecord[]> {
  if (devAuthEnabled()) {
    return devBucket(userId).events.slice(0, limit);
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return [];

  const { data, error } = await admin
    .from("user_behavior_events")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map((r) => rowEvent(r as Record<string, unknown>));
}

export async function getOperationalProfile(
  userId: string
): Promise<OperationalProfile | null> {
  if (devAuthEnabled()) {
    return devBucket(userId).profile;
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return null;

  const { data } = await admin
    .from("user_operational_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return null;
  return rowProfile(userId, data as Record<string, unknown>);
}

export async function saveOperationalProfile(
  profile: OperationalProfile
): Promise<{ ok: boolean; error?: string }> {
  const row = {
    user_id: profile.userId,
    behavioral_score: profile.behavioralScore,
    operational_style: profile.operationalStyle,
    live_affinity: profile.liveAffinity,
    pressure_preference: profile.pressurePreference,
    gpi_affinity: profile.gpiAffinity,
    telegram_affinity: profile.telegramAffinity,
    traits: profile.traits,
    updated_at: profile.updatedAt,
  };

  if (devAuthEnabled()) {
    devBucket(profile.userId).profile = profile;
    return { ok: true };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "behavior_nao_configurado" };

  const { error } = await admin.from("user_operational_profiles").upsert(row, {
    onConflict: "user_id",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
