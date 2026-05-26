import { evaluateMatchContext } from "@/components/terminal/intelligence/ContextEngine";
import { matchToContextMatch } from "@/lib/autonomous/matchContextBridge";
import type { Match } from "@/types/domain";
import { batchUpsertIgnoreDuplicates } from "@/lib/persistence/persistenceBatch";
import { getPersistenceConfig } from "@/lib/persistence/persistenceConfig";
import { shouldPersistFixtureMinute } from "@/lib/persistence/persistenceThrottle";

function fixtureId(match: Match): string {
  return match.externalId ?? match.id.replace(/^sm-/, "") ?? match.id;
}

function isLive(match: Match): boolean {
  return match.status === "LIVE" || match.status === "HALFTIME";
}

export function buildContextualReadingRows(matches: Match[]): Record<string, unknown>[] {
  const config = getPersistenceConfig();
  const rows: Record<string, unknown>[] = [];

  for (const match of matches) {
    if (!isLive(match)) continue;
    const fid = fixtureId(match);
    const minute = Math.max(0, match.minute ?? 0);
    if (
      !shouldPersistFixtureMinute("contextual", fid, minute, config.fixtureMinIntervalMs)
    ) {
      continue;
    }

    const enriched = matchToContextMatch(match);
    const ctx = evaluateMatchContext(enriched);

    rows.push({
      fixture_id: fid,
      minute,
      context_score: ctx.score,
      context_level: ctx.level,
      alert_level: ctx.alerta,
      status_operacional: ctx.statusOperacional,
      narrative: ctx.narrativa.slice(0, 1200),
      badges_json: ctx.badges,
      metadata_json: {
        recomendacao: ctx.recomendacao,
        tendencia: ctx.tendencia,
        leituraMercado: ctx.leituraMercado,
      },
    });
  }

  return rows;
}

export async function persistContextualReadings(matches: Match[]): Promise<number> {
  const config = getPersistenceConfig();
  if (config.sandbox) return 0;

  const rows = buildContextualReadingRows(matches);
  return batchUpsertIgnoreDuplicates(
    "contextual_readings",
    rows,
    "fixture_id,minute",
    config.batchSize
  );
}
