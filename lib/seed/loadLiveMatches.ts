import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { SEED_PREFIX } from "@/lib/seed/config";
import { mapDbRowToMatch, type DbMatchRow } from "@/lib/seed/mapDbToMatch";
import type { Match } from "@/types/domain";

/** Lê jogos LIVE/HALFTIME do seed no Supabase para o terminal (modo dev). */
export async function loadSeedLiveMatches(): Promise<Match[]> {
  if (!isSupabaseConfigured()) return [];

  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("matches")
    .select("*")
    .like("external_id", `${SEED_PREFIX}%`)
    .in("status", ["LIVE", "HALFTIME"])
    .order("pressure_score", { ascending: false });

  if (error || !data?.length) return [];

  return (data as DbMatchRow[]).map(mapDbRowToMatch);
}

import { isSeedAllowed } from "@/lib/data-source/config";

/** Seed só quando GP_SEED_LIVE=true E não há token SportMonks. */
export function isSeedLiveModeEnabled(): boolean {
  return isSeedAllowed();
}
