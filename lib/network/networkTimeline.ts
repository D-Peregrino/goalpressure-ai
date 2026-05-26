import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { getNetworkConfig } from "@/lib/network/networkConfig";
import { getNetworkDevState } from "@/lib/network/networkDevStore";
import type { CollectiveContext, NetworkTimelineEntry, SharedSignal } from "@/lib/network/network.types";

export async function appendTimelineEntry(
  fixtureId: string,
  eventType: string,
  label: string,
  payload?: Record<string, unknown>
): Promise<void> {
  const entry: NetworkTimelineEntry = {
    id: crypto.randomUUID(),
    fixtureId,
    eventType,
    label,
    payload: payload ?? {},
    createdAt: new Date().toISOString(),
  };

  if (getNetworkConfig().sandbox) {
    getNetworkDevState().timeline.unshift(entry);
    getNetworkDevState().timeline = getNetworkDevState().timeline.slice(0, 80);
    return;
  }

  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("network_timeline").insert({
    fixture_id: fixtureId,
    event_type: eventType,
    label,
    payload: payload ?? {},
  });
}

export function synthesizeTimelineFromActivity(
  signals: SharedSignal[],
  contexts: CollectiveContext[]
): NetworkTimelineEntry[] {
  const entries: NetworkTimelineEntry[] = [];

  for (const c of contexts) {
    if (c.consensusScore >= 50) {
      entries.push({
        id: `syn-cons-${c.fixtureId}`,
        fixtureId: c.fixtureId,
        eventType: "consensus",
        label: `Consenso ${c.consensusScore} — ${c.observerCount} observadores`,
        payload: { consensus: c.consensusScore },
        createdAt: c.updatedAt,
      });
    }
  }

  for (const s of signals) {
    if (s.gpiScore != null && s.gpiScore >= 70) {
      entries.push({
        id: `syn-gpi-${s.id}`,
        fixtureId: s.fixtureId,
        eventType: "gpi_rise",
        label: `${s.minute ?? "—"}' — GPI ${s.gpiScore} em destaque`,
        payload: { gpi: s.gpiScore },
        createdAt: s.createdAt,
      });
    }
    if (s.signalType === "watch") {
      entries.push({
        id: `syn-watch-${s.id}`,
        fixtureId: s.fixtureId,
        eventType: "watchlist",
        label: `${s.minute ?? "—"}' — watchlist operacional atualizada`,
        payload: {},
        createdAt: s.createdAt,
      });
    }
    if (s.signalType === "rupture") {
      entries.push({
        id: `syn-rupt-${s.id}`,
        fixtureId: s.fixtureId,
        eventType: "rupture",
        label: `${s.minute ?? "—"}' — ruptura marcada por operador`,
        payload: {},
        createdAt: s.createdAt,
      });
    }
  }

  return entries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 40);
}

export async function listNetworkTimeline(
  fixtureId?: string
): Promise<NetworkTimelineEntry[]> {
  if (getNetworkConfig().sandbox) {
    const all = getNetworkDevState().timeline;
    return fixtureId ? all.filter((t) => t.fixtureId === fixtureId) : all;
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return getNetworkDevState().timeline;
  }

  let q = admin.from("network_timeline").select("*").order("created_at", { ascending: false }).limit(40);
  if (fixtureId) q = q.eq("fixture_id", fixtureId);

  const { data } = await q;
  if (!data?.length) return getNetworkDevState().timeline;

  return data.map((r) => ({
    id: String(r.id),
    fixtureId: String(r.fixture_id),
    eventType: String(r.event_type),
    label: String(r.label),
    payload: (r.payload as Record<string, unknown>) ?? {},
    createdAt: String(r.created_at),
  }));
}

export async function refreshTimelineFromSignal(
  signal: SharedSignal,
  consensus?: CollectiveContext
): Promise<void> {
  if (signal.gpiScore != null) {
    await appendTimelineEntry(
      signal.fixtureId,
      "gpi_rise",
      `${signal.minute ?? "—"}' — GPI ${signal.gpiScore}`,
      { gpi: signal.gpiScore }
    );
  }
  if (signal.signalType === "watch") {
    await appendTimelineEntry(
      signal.fixtureId,
      "watchlist",
      `${signal.minute ?? "—"}' — operadores adicionaram watchlist`,
      {}
    );
  }
  if (consensus && consensus.consensusScore >= 60) {
    await appendTimelineEntry(
      signal.fixtureId,
      "consensus",
      `Consenso ${consensus.consensusScore} — pressão coletiva ${consensus.collectivePressure}`,
      { consensus: consensus.consensusScore }
    );
  }
}
