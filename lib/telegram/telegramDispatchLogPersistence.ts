import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";
import { buildRouteContextTags } from "@/lib/telegram/telegramDestinations";
import type {
  TelegramDispatchLogRow,
  TelegramDispatchLogStatus,
  TelegramRouteContext,
} from "@/lib/telegram/telegramDestination.types";

const LOG_SCOPE = "telegram-dispatch-logs";

export interface PersistTelegramDispatchLogInput {
  destinationId?: string | null;
  destinationName?: string | null;
  chatId?: string | null;
  pipeline: string;
  alertType?: string;
  priority?: string;
  fixtureId?: string;
  signalId?: string;
  status: TelegramDispatchLogStatus;
  errorMessage?: string;
  messagePreview?: string;
  telegramMessageId?: string;
  latencyMs?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export async function persistTelegramDispatchLog(
  input: PersistTelegramDispatchLogInput
): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  const client = getSupabaseAdmin();
  if (!client) return false;

  const row = {
    destination_id: input.destinationId ?? null,
    destination_name: input.destinationName ?? null,
    chat_id: input.chatId ?? null,
    pipeline: input.pipeline,
    alert_type: input.alertType ?? null,
    priority: input.priority ?? null,
    fixture_id: input.fixtureId ?? null,
    signal_id: input.signalId ?? null,
    status: input.status,
    error_message: input.errorMessage ?? null,
    message_preview: input.messagePreview?.slice(0, 500) ?? null,
    telegram_message_id: input.telegramMessageId ?? null,
    latency_ms: input.latencyMs ?? null,
    tags: input.tags ?? [],
    metadata: input.metadata ?? {},
  };

  const { error } = await client.from("telegram_dispatch_logs").insert(row);
  if (error) {
    logWarn(LOG_SCOPE, "insert failed", { message: error.message });
    return false;
  }
  return true;
}

export async function listTelegramDispatchLogs(options?: {
  status?: "sent" | "failed" | "sandbox" | "all";
  limit?: number;
}): Promise<TelegramDispatchLogRow[]> {
  const limit = Math.min(200, options?.limit ?? 50);

  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  let query = client
    .from("telegram_dispatch_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options?.status && options.status !== "all") {
    if (options.status === "failed") {
      query = query.eq("status", "failed");
    } else {
      query = query.eq("status", options.status);
    }
  }

  const { data, error } = await query;
  if (error) {
    logWarn(LOG_SCOPE, "list failed", { message: error.message });
    return [];
  }

  return (data ?? []).map((r) => ({
    id: String(r.id),
    destination_id: r.destination_id ? String(r.destination_id) : null,
    destination_name: r.destination_name ? String(r.destination_name) : null,
    chat_id: r.chat_id ? String(r.chat_id) : null,
    pipeline: String(r.pipeline),
    alert_type: r.alert_type ? String(r.alert_type) : null,
    priority: r.priority ? String(r.priority) : null,
    fixture_id: r.fixture_id ? String(r.fixture_id) : null,
    signal_id: r.signal_id ? String(r.signal_id) : null,
    status: r.status as TelegramDispatchLogRow["status"],
    error_message: r.error_message ? String(r.error_message) : null,
    message_preview: r.message_preview ? String(r.message_preview) : null,
    telegram_message_id: r.telegram_message_id ? String(r.telegram_message_id) : null,
    latency_ms: r.latency_ms != null ? Number(r.latency_ms) : null,
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    created_at: String(r.created_at),
  }));
}

export function routeContextToLogTags(ctx: TelegramRouteContext): string[] {
  return [...buildRouteContextTags(ctx)];
}
