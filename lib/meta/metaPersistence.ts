/**
 * Persistência Supabase — meta_consensus_metrics.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import type { MetaConsensusResult, MetaConsensusMetricsRow } from "@/types/meta";
import { logInfo, logOps, logWarn } from "@/lib/utils/logger";

const LOG_SCOPE = "meta-persistence";

function toRow(result: MetaConsensusResult): MetaConsensusMetricsRow {
  return {
    fixture_id: result.fixtureId,
    minute: result.minute,
    consensus_score: result.consensusScore,
    institutional_confidence: result.institutionalConfidence,
    execution_grade: result.executionGrade,
    trigger_approval: result.triggerApproval,
    market_agreement: result.marketAgreement,
    contextual_alignment: result.contextualAlignment,
    edge_persistence: result.edgePersistence,
    volatility_risk: result.volatilityRisk,
    false_positive_risk: result.falsePositiveRisk,
    execution_decision: result.executionDecision,
    metadata: {
      match_id: result.matchId,
      match_label: result.matchLabel,
      consensus_flags: result.consensusFlags,
      dominant_engines: result.dominantEngines,
      computed_at: result.computedAt,
    },
  };
}

export async function persistMetaConsensusMetric(
  result: MetaConsensusResult
): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const client = getSupabaseAdmin();
  if (!client) return false;

  try {
    const { error } = await client
      .from("meta_consensus_metrics")
      .insert(toRow(result));
    if (error) throw new Error(error.message);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown";
    logWarn(LOG_SCOPE, "meta_consensus_metrics insert failed", {
      fixtureId: result.fixtureId,
      message,
    });
    return false;
  }
}

export async function persistMetaConsensusMetricsBatch(
  results: MetaConsensusResult[]
): Promise<{ persisted: number; failed: number }> {
  let persisted = 0;
  let failed = 0;

  for (const r of results) {
    const ok = await persistMetaConsensusMetric(r);
    if (ok) persisted += 1;
    else failed += 1;
  }

  logInfo(LOG_SCOPE, "Meta consensus batch", {
    processed: results.length,
    persisted,
    failed,
  });

  if (persisted > 0) {
    logOps(LOG_SCOPE, `[meta-consensus] persisted ${persisted} rows`);
  }

  return { persisted, failed };
}

export async function fetchRecentMetaConsensusMetrics(
  limit = 50
): Promise<MetaConsensusMetricsRow[]> {
  if (!isSupabaseConfigured()) return [];

  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("meta_consensus_metrics")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    logWarn(LOG_SCOPE, "fetch meta_consensus_metrics failed", {
      message: error.message,
    });
    return [];
  }

  return (data ?? []) as MetaConsensusMetricsRow[];
}
