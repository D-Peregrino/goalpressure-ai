import type { ExecutedDispatch } from "@/lib/execution/execution.types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "dispatch-persistence";

export async function persistLiveSignalDispatch(
  dispatch: ExecutedDispatch
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return false;

  const routes = dispatch.routes.join(",");

  const { error } = await admin.from("live_signal_dispatches").insert({
    fixture_id: dispatch.fixtureId,
    signal_type: dispatch.signalType,
    urgency: dispatch.urgency,
    dispatched_to: routes,
    message: dispatch.message,
    confidence: dispatch.confidence,
    ev: dispatch.evPercent,
    telegram_sent: dispatch.telegramSent,
    push_sent: dispatch.pushSent,
  });

  if (error) {
    logWarn(LOG_SCOPE, "live_signal_dispatches insert failed", {
      message: error.message,
    });
    return false;
  }
  return true;
}
