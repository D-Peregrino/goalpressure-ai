import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { getNetworkConfig } from "@/lib/network/networkConfig";

/** Agrega observadores por fixture a partir de watchlists — somente leitura. */
export async function aggregateSharedWatchlists(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();

  if (getNetworkConfig().sandbox) {
    counts.set("demo-liv-mci", 4);
    counts.set("demo-bar-atm", 2);
    return counts;
  }

  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) {
    return counts;
  }

  const { data } = await admin.from("user_watchlists").select("fixture_id");
  if (!data) return counts;

  for (const row of data) {
    const fid = String(row.fixture_id);
    counts.set(fid, (counts.get(fid) ?? 0) + 1);
  }

  return counts;
}

export function watchlistObserverLabel(count: number): string {
  if (count <= 0) return "sem observadores em watchlist";
  if (count === 1) return "1 operador na watchlist";
  return `${count} operadores na watchlist`;
}
