import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { devAuthEnabled } from "@/lib/auth/devStore";
import { getNetworkConfig } from "@/lib/network/networkConfig";
import { getNetworkDevState } from "@/lib/network/networkDevStore";
import { logNetworkEvent } from "@/lib/network/networkLogger";
import type { PostSignalInput, SharedSignal } from "@/lib/network/network.types";

function rowSignal(
  r: Record<string, unknown>,
  votes?: { validate: number; useful: number }
): SharedSignal {
  return {
    id: String(r.id),
    userId: String(r.user_id),
    operatorName: String(r.display_name ?? "Operador"),
    fixtureId: String(r.fixture_id),
    matchLabel: String(r.match_label),
    league: (r.league as string) ?? null,
    signalType: r.signal_type as SharedSignal["signalType"],
    body: String(r.body),
    minute: r.minute != null ? Number(r.minute) : null,
    pressureScore: r.pressure_score != null ? Number(r.pressure_score) : null,
    gpiScore: r.gpi_score != null ? Number(r.gpi_score) : null,
    validateCount: votes?.validate ?? Number(r.validate_count ?? 0),
    usefulCount: votes?.useful ?? Number(r.useful_count ?? 0),
    createdAt: String(r.created_at),
  };
}

export async function listSharedSignals(limit?: number): Promise<SharedSignal[]> {
  const max = limit ?? getNetworkConfig().maxSignalsPerFeed;

  if (devAuthEnabled() || getNetworkConfig().sandbox) {
    return getNetworkDevState().signals.slice(0, max);
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return getNetworkDevState().signals.slice(0, max);

  const { data, error } = await admin
    .from("shared_signals")
    .select("*, operator_profiles(display_name)")
    .order("created_at", { ascending: false })
    .limit(max);

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as Record<string, unknown>;
    const prof = r.operator_profiles as { display_name?: string } | null;
    return rowSignal(
      { ...r, display_name: prof?.display_name ?? "Operador" },
      undefined
    );
  });
}

export async function createSharedSignal(
  userId: string,
  displayName: string,
  input: PostSignalInput
): Promise<{ ok: boolean; signal?: SharedSignal; error?: string }> {
  const body = input.body.trim().slice(0, 500);
  if (!body) return { ok: false, error: "body_obrigatorio" };

  const payload = {
    user_id: userId,
    fixture_id: input.fixtureId,
    match_label: input.matchLabel,
    league: input.league ?? null,
    signal_type: input.signalType,
    body,
    minute: input.minute ?? null,
    pressure_score: input.pressureScore ?? null,
    gpi_score: input.gpiScore ?? null,
  };

  if (devAuthEnabled() || getNetworkConfig().sandbox) {
    const state = getNetworkDevState();
    const signal: SharedSignal = {
      id: crypto.randomUUID(),
      userId,
      operatorName: displayName,
      fixtureId: input.fixtureId,
      matchLabel: input.matchLabel,
      league: input.league ?? null,
      signalType: input.signalType,
      body,
      minute: input.minute ?? null,
      pressureScore: input.pressureScore ?? null,
      gpiScore: input.gpiScore ?? null,
      validateCount: 0,
      usefulCount: 0,
      createdAt: new Date().toISOString(),
    };
    state.signals.unshift(signal);
    await logNetworkEvent({ event: "signal_created", userId, fixtureId: input.fixtureId });
    return { ok: true, signal };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "network_nao_configurado" };

  const { data, error } = await admin.from("shared_signals").insert(payload).select("*").single();
  if (error) return { ok: false, error: error.message };

  await logNetworkEvent({ event: "signal_created", userId, fixtureId: input.fixtureId });
  return {
    ok: true,
    signal: rowSignal({ ...(data as Record<string, unknown>), display_name: displayName }),
  };
}

export async function voteOnSignal(
  userId: string,
  signalId: string,
  vote: "validate" | "useful" | "caution"
): Promise<{ ok: boolean; error?: string }> {
  if (devAuthEnabled() || getNetworkConfig().sandbox) {
    const state = getNetworkDevState();
    const sig = state.signals.find((s) => s.id === signalId);
    if (!sig) return { ok: false, error: "signal_nao_encontrado" };
    if (vote === "validate") sig.validateCount += 1;
    if (vote === "useful") sig.usefulCount += 1;
    await logNetworkEvent({ event: "signal_vote", userId, signalId, vote });
    return { ok: true };
  }

  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, error: "network_nao_configurado" };

  const { error } = await admin.from("signal_votes").upsert(
    { signal_id: signalId, user_id: userId, vote },
    { onConflict: "signal_id,user_id" }
  );

  if (error) return { ok: false, error: error.message };
  await logNetworkEvent({ event: "signal_vote", userId, signalId, vote });
  return { ok: true };
}
