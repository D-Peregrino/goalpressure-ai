import { readdir, readFile } from "fs/promises";
import path from "path";
import type { SignalOutcomeRecord } from "@/lib/storage/signalOutcomeStorage";
import type { HistoricalSignalOutcome } from "@/lib/engine/learning/learning.types";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";

const SIGNALS_DIR = path.join(process.cwd(), "data", "signals");

function mapRecord(r: SignalOutcomeRecord): HistoricalSignalOutcome | null {
  if (r.status !== "RESOLVED" || !r.outcome) return null;
  return {
    fixtureId: r.externalId,
    signalType: r.metadata.reason.split("·")[0]?.trim() || r.market,
    market: r.market,
    minute: r.triggerMinute,
    pressureScore: r.triggerPressure,
    evPercent: null,
    confidence: r.confidence === "HIGH" ? 75 : r.confidence === "MEDIUM" ? 50 : 25,
    confidenceClass: r.confidence,
    odd: r.triggerOdds,
    outcome: r.outcome,
    finalScore: r.finalScore
      ? `${r.finalScore.home}-${r.finalScore.away}`
      : "0-0",
    league: r.league,
    homeTeam: r.homeTeam,
    awayTeam: r.awayTeam,
    temperature: null,
    createdAt: r.createdAt,
  };
}

async function loadFromLocalFiles(): Promise<HistoricalSignalOutcome[]> {
  try {
    const entries = await readdir(SIGNALS_DIR);
    const outcomes: HistoricalSignalOutcome[] = [];
    for (const name of entries) {
      if (!name.startsWith("signal-") || !name.endsWith(".json")) continue;
      try {
        const raw = await readFile(path.join(SIGNALS_DIR, name), "utf8");
        const record = JSON.parse(raw) as SignalOutcomeRecord;
        const mapped = mapRecord(record);
        if (mapped) outcomes.push(mapped);
      } catch {
        /* skip corrupt */
      }
    }
    return outcomes;
  } catch {
    return [];
  }
}

async function loadFromSupabase(): Promise<HistoricalSignalOutcome[]> {
  const admin = getSupabaseAdmin();
  if (!admin || !isSupabaseConfigured()) return [];

  const { data, error } = await admin
    .from("historical_signal_outcomes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error || !data) return [];

  return data.map((row) => ({
    fixtureId: String(row.fixture_id),
    signalType: String(row.signal_type),
    market: row.market as HistoricalSignalOutcome["market"],
    minute: Number(row.minute ?? 0),
    pressureScore: Number(row.pressure_score ?? 0),
    evPercent: row.ev != null ? Number(row.ev) : null,
    confidence: Number(row.confidence ?? 0),
    confidenceClass: row.confidence_class != null ? String(row.confidence_class) : null,
    odd: Number(row.odd ?? 1),
    outcome: row.outcome as HistoricalSignalOutcome["outcome"],
    finalScore: String(row.final_score ?? "0-0"),
    league: String(row.league ?? ""),
    homeTeam: String(row.home_team ?? ""),
    awayTeam: String(row.away_team ?? ""),
    temperature: row.temperature as HistoricalSignalOutcome["temperature"],
    createdAt: String(row.created_at),
  }));
}

/**
 * Carrega outcomes históricos (Supabase + arquivos locais, deduplicados).
 */
export async function loadHistoricalOutcomes(): Promise<HistoricalSignalOutcome[]> {
  const [local, remote] = await Promise.all([
    loadFromLocalFiles(),
    loadFromSupabase(),
  ]);

  const byKey = new Map<string, HistoricalSignalOutcome>();
  for (const o of [...remote, ...local]) {
    const key = `${o.fixtureId}|${o.market}|${o.createdAt}`;
    byKey.set(key, o);
  }
  return [...byKey.values()];
}
