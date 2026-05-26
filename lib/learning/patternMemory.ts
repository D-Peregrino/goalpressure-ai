import type { Match } from "@/types/domain";
import type { AdaptivePatternId, PatternMemoryEntry } from "@/lib/learning/adaptiveLearning.types";
import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { matchToContextMatch } from "@/lib/autonomous/matchContextBridge";

const PATTERN_LABELS: Record<AdaptivePatternId, string> = {
  pressao_sustentada: "Pressão sustentada",
  transicao_rapida: "Transição rápida",
  ruptura_ofensiva: "Ruptura ofensiva",
  dominio_territorial: "Domínio territorial",
  aceleracao_progressiva: "Aceleração progressiva",
};

const LIKELY_OUTCOME: Record<AdaptivePatternId, string> = {
  pressao_sustentada: "Continuidade ofensiva com pressão prolongada",
  transicao_rapida: "Aceleração tática nos próximos minutos",
  ruptura_ofensiva: "Ruptura contextual provável",
  dominio_territorial: "Domínio territorial consolidado",
  aceleracao_progressiva: "Escalada ofensiva progressiva",
};

interface MemoryCell {
  frequency: number;
  hits: number;
  misses: number;
  lastSeenAt: string;
}

const memory = new Map<string, MemoryCell>();

function key(id: AdaptivePatternId, league: string): string {
  return `${id}|${league}`;
}

export function detectPatternsForMatch(match: Match): AdaptivePatternId[] {
  const ctx = evaluateMatchContext(matchToContextMatch(match) as import("@/hooks/useLiveMatchCenter").EnrichedLiveMatch);
  const p = match.pressure?.score ?? 0;
  const accel = match.feedMeta?.offensiveEngine?.accelerationScore ?? 0;
  const territorial = match.feedMeta?.offensiveEngine?.territorialScore ?? 0;
  const patterns: AdaptivePatternId[] = [];

  if (p >= 62 && (match.feedMeta?.pressureTrend === "RISING" || p >= 70)) {
    patterns.push("pressao_sustentada");
  }
  if (accel >= 55 || ctx.level === "pressao_crescente") {
    patterns.push("transicao_rapida");
  }
  if (ctx.level === "zona_critica" || ctx.level === "oportunidade_ev") {
    patterns.push("ruptura_ofensiva");
  }
  if (territorial >= 58) {
    patterns.push("dominio_territorial");
  }
  if (accel >= 45 && p >= 50) {
    patterns.push("aceleracao_progressiva");
  }

  return patterns;
}

export function recordPatternObservation(
  match: Match,
  outcome?: "hit" | "miss"
): void {
  const league = match.league || "Geral";
  for (const id of detectPatternsForMatch(match)) {
    const k = key(id, league);
    const cell = memory.get(k) ?? { frequency: 0, hits: 0, misses: 0, lastSeenAt: "" };
    cell.frequency += 1;
    cell.lastSeenAt = new Date().toISOString();
    if (outcome === "hit") cell.hits += 1;
    if (outcome === "miss") cell.misses += 1;
    memory.set(k, cell);
  }
}

export function ingestOutcomePatterns(
  league: string,
  pressure: number,
  hit: boolean
): void {
  if (pressure < 65) return;
  const id: AdaptivePatternId = "pressao_sustentada";
  const k = key(id, league);
  const cell = memory.get(k) ?? { frequency: 0, hits: 0, misses: 0, lastSeenAt: "" };
  cell.frequency += 1;
  if (hit) cell.hits += 1;
  else cell.misses += 1;
  cell.lastSeenAt = new Date().toISOString();
  memory.set(k, cell);
}

export function getStrongPatterns(limit = 6): PatternMemoryEntry[] {
  const rows: PatternMemoryEntry[] = [];
  for (const [k, cell] of memory) {
    const [id] = k.split("|") as [AdaptivePatternId, string];
    const total = cell.hits + cell.misses;
    const effectivenessPct =
      total > 0 ? Math.round((cell.hits / total) * 100) : Math.min(72, 40 + cell.frequency);
    rows.push({
      id,
      label: PATTERN_LABELS[id],
      frequency: cell.frequency,
      effectivenessPct,
      likelyOutcome: LIKELY_OUTCOME[id],
      lastSeenAt: cell.lastSeenAt,
    });
  }
  return rows
    .sort((a, b) => b.effectivenessPct - a.effectivenessPct || b.frequency - a.frequency)
    .slice(0, limit);
}

export function getPatternWeight(patternId: AdaptivePatternId, league: string): number {
  const cell = memory.get(key(patternId, league));
  if (!cell || cell.frequency < 3) return 1;
  const total = cell.hits + cell.misses;
  if (total === 0) return 1;
  const rate = cell.hits / total;
  if (rate >= 0.62) return 1.12;
  if (rate <= 0.38) return 0.88;
  return 1;
}

export function patternMemoryCount(): number {
  return memory.size;
}
