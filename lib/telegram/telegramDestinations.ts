import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";
import type {
  TelegramDestination,
  TelegramDestinationInput,
  TelegramDestinationType,
  TelegramRouteContext,
} from "@/lib/telegram/telegramDestination.types";

const LOG_SCOPE = "telegram-destinations";

declare global {
  // eslint-disable-next-line no-var
  var __GP_TELEGRAM_DESTINATIONS_DEV__: TelegramDestination[] | undefined;
}

const PRIORITY_RANK: Record<string, number> = {
  baixa: 1,
  moderada: 2,
  alta: 3,
  critica: 4,
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function devStore(): TelegramDestination[] {
  if (!globalThis.__GP_TELEGRAM_DESTINATIONS_DEV__) {
    globalThis.__GP_TELEGRAM_DESTINATIONS_DEV__ = [];
  }
  return globalThis.__GP_TELEGRAM_DESTINATIONS_DEV__;
}

function rowToDestination(row: Record<string, unknown>): TelegramDestination {
  return {
    id: String(row.id),
    name: String(row.name),
    type: String(row.type) as TelegramDestinationType,
    chat_id: String(row.chat_id),
    active: Boolean(row.active),
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    created_at: String(row.created_at),
    updated_at: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function normalizeDestinationTags(tags: string[] | undefined): string[] {
  if (!tags?.length) return [];
  return [...new Set(tags.map((t) => t.trim().toLowerCase()).filter(Boolean))];
}

export function buildRouteContextTags(ctx: TelegramRouteContext): Set<string> {
  const tags = new Set(normalizeDestinationTags(ctx.tags));
  tags.add(`pipeline:${ctx.pipeline}`);
  if (ctx.alertType) tags.add(`alert:${ctx.alertType.toLowerCase()}`);
  if (ctx.priority) tags.add(`priority:${ctx.priority.toLowerCase()}`);
  return tags;
}

function priorityRank(value: string | undefined): number {
  if (!value) return 0;
  return PRIORITY_RANK[value.toLowerCase()] ?? 0;
}

function destinationMatchesTag(
  tag: string,
  ctx: TelegramRouteContext,
  ctxTags: Set<string>
): boolean {
  const lower = tag.toLowerCase();
  if (lower.startsWith("priority:")) {
    const min = lower.slice("priority:".length);
    const minRank = priorityRank(min);
    const ctxRank = priorityRank(ctx.priority);
    return ctxRank >= minRank && ctxRank > 0;
  }
  if (lower.startsWith("min_priority:")) {
    const min = lower.slice("min_priority:".length);
    return priorityRank(ctx.priority) >= priorityRank(min);
  }
  return ctxTags.has(lower);
}

/** Destino ativo casa com o contexto (tags vazias = recebe tudo). */
export function destinationMatchesContext(
  dest: TelegramDestination,
  ctx: TelegramRouteContext
): boolean {
  if (!dest.active) return false;
  const destTags = normalizeDestinationTags(dest.tags);
  if (destTags.length === 0) return true;

  const ctxTags = buildRouteContextTags(ctx);
  return destTags.every((tag) => destinationMatchesTag(tag, ctx, ctxTags));
}

export async function listTelegramDestinations(): Promise<TelegramDestination[]> {
  const db = getSupabaseAdmin();
  if (db && isSupabaseConfigured()) {
    const { data, error } = await db
      .from("telegram_destinations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      logWarn(LOG_SCOPE, "list failed", { message: error.message });
      return [];
    }
    return (data ?? []).map((r) => rowToDestination(r as Record<string, unknown>));
  }
  return [...devStore()].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function listActiveTelegramDestinations(): Promise<TelegramDestination[]> {
  const all = await listTelegramDestinations();
  return all.filter((d) => d.active);
}

export async function resolveTelegramDestinations(
  ctx: TelegramRouteContext
): Promise<TelegramDestination[]> {
  const active = await listActiveTelegramDestinations();
  return active.filter((d) => destinationMatchesContext(d, ctx));
}

export async function getTelegramDestinationById(
  id: string
): Promise<TelegramDestination | null> {
  const db = getSupabaseAdmin();
  if (db && isSupabaseConfigured()) {
    const { data, error } = await db
      .from("telegram_destinations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return rowToDestination(data as Record<string, unknown>);
  }
  return devStore().find((d) => d.id === id) ?? null;
}

export async function createTelegramDestination(
  input: TelegramDestinationInput
): Promise<TelegramDestination> {
  const now = new Date().toISOString();
  const row = {
    name: input.name.trim(),
    type: input.type,
    chat_id: input.chat_id.trim(),
    active: input.active ?? true,
    tags: normalizeDestinationTags(input.tags),
    updated_at: now,
  };

  const db = getSupabaseAdmin();
  if (db && isSupabaseConfigured()) {
    const { data, error } = await db
      .from("telegram_destinations")
      .insert(row)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return rowToDestination(data as Record<string, unknown>);
  }

  const dest: TelegramDestination = {
    id: `dev-${Date.now()}`,
    ...row,
    created_at: now,
  };
  devStore().unshift(dest);
  return dest;
}

export async function updateTelegramDestination(
  id: string,
  patch: Partial<TelegramDestinationInput>
): Promise<TelegramDestination | null> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { updated_at: now };
  if (patch.name != null) update.name = patch.name.trim();
  if (patch.type != null) update.type = patch.type;
  if (patch.chat_id != null) update.chat_id = patch.chat_id.trim();
  if (patch.active != null) update.active = patch.active;
  if (patch.tags != null) update.tags = normalizeDestinationTags(patch.tags);

  const db = getSupabaseAdmin();
  if (db && isSupabaseConfigured()) {
    const { data, error } = await db
      .from("telegram_destinations")
      .update(update)
      .eq("id", id)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToDestination(data as Record<string, unknown>) : null;
  }

  const store = devStore();
  const idx = store.findIndex((d) => d.id === id);
  if (idx < 0) return null;
  store[idx] = {
    ...store[idx]!,
    ...(patch.name != null ? { name: patch.name.trim() } : {}),
    ...(patch.type != null ? { type: patch.type } : {}),
    ...(patch.chat_id != null ? { chat_id: patch.chat_id.trim() } : {}),
    ...(patch.active != null ? { active: patch.active } : {}),
    ...(patch.tags != null ? { tags: normalizeDestinationTags(patch.tags) } : {}),
    updated_at: now,
  };
  return store[idx]!;
}

export async function deleteTelegramDestination(id: string): Promise<boolean> {
  const db = getSupabaseAdmin();
  if (db && isSupabaseConfigured()) {
    const { error } = await db.from("telegram_destinations").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  }
  const store = devStore();
  const idx = store.findIndex((d) => d.id === id);
  if (idx >= 0) store.splice(idx, 1);
  return idx >= 0;
}

/** Seed env TELEGRAM_CHAT_ID as destination when table empty (migration helper). */
export async function ensureEnvFallbackDestination(): Promise<void> {
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!chatId) return;

  const existing = await listTelegramDestinations();
  if (existing.some((d) => d.chat_id === chatId)) return;

  await createTelegramDestination({
    name: "Env fallback",
    type: "channel",
    chat_id: chatId,
    active: true,
    tags: [],
  });
}

export function hasTelegramDestinationsConfigured(
  destinations: TelegramDestination[]
): boolean {
  if (destinations.some((d) => d.active)) return true;
  const { botToken, chatId } = {
    botToken: process.env.TELEGRAM_BOT_TOKEN?.trim(),
    chatId: process.env.TELEGRAM_CHAT_ID?.trim(),
  };
  return Boolean(botToken && chatId);
}
