import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

export interface CopaLeadInput {
  name?: string;
  email: string;
  telegram?: string;
  source?: string;
}

export interface CopaLeadRow {
  id: string;
  name: string | null;
  email: string;
  telegram: string | null;
  source: string;
  created_at: string;
}

declare global {
  // eslint-disable-next-line no-var
  var __GP_COPA_LEADS_DEV__: CopaLeadRow[] | undefined;
}

function devStore(): CopaLeadRow[] {
  if (!globalThis.__GP_COPA_LEADS_DEV__) {
    globalThis.__GP_COPA_LEADS_DEV__ = [];
  }
  return globalThis.__GP_COPA_LEADS_DEV__;
}

export async function insertCopaLead(
  input: CopaLeadInput
): Promise<{ ok: boolean; id?: string }> {
  const email = input.email.trim().toLowerCase();
  const row = {
    name: input.name?.trim() || null,
    email,
    telegram: input.telegram?.trim() || null,
    source: input.source?.trim() || "copa",
  };

  const admin = getSupabaseAdmin();
  if (admin && isSupabaseConfigured()) {
    const { data, error } = await admin
      .from("copa_leads")
      .insert(row)
      .select("id")
      .single();
    if (error) return { ok: false };
    return { ok: true, id: data.id as string };
  }

  const id = `copa_${Date.now()}`;
  devStore().unshift({
    id,
    name: row.name,
    email: row.email,
    telegram: row.telegram,
    source: row.source,
    created_at: new Date().toISOString(),
  });
  return { ok: true, id };
}

export async function fetchCopaLeads(limit = 500): Promise<CopaLeadRow[]> {
  const admin = getSupabaseAdmin();
  if (admin && isSupabaseConfigured()) {
    const { data, error } = await admin
      .from("copa_leads")
      .select("id, name, email, telegram, source, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) return [];
    return (data ?? []) as CopaLeadRow[];
  }
  return devStore();
}
