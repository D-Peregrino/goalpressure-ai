import { getAutonomousAlertSnapshot } from "@/lib/autonomous/autonomousAlertSnapshotStore";
import { batchUpsertIgnoreDuplicates } from "@/lib/persistence/persistenceBatch";
import { getPersistenceConfig } from "@/lib/persistence/persistenceConfig";
import { shouldPersistAlertFingerprint } from "@/lib/persistence/persistenceThrottle";

function alertFingerprint(kind: string, minute: number, headline: string): string {
  return `${kind}|${Math.floor(minute / 5)}|${headline.slice(0, 48)}`;
}

export function buildAutonomousAlertRows(): Record<string, unknown>[] {
  const config = getPersistenceConfig();
  const snapshot = getAutonomousAlertSnapshot();
  if (!snapshot?.recentAlerts.length) return [];

  const rows: Record<string, unknown>[] = [];
  for (const alert of snapshot.recentAlerts) {
    const fp = alertFingerprint(alert.kind, alert.minute, alert.headline);
    if (
      !shouldPersistAlertFingerprint(
        alert.fixtureId,
        fp,
        config.fixtureMinIntervalMs
      )
    ) {
      continue;
    }

    rows.push({
      fixture_id: alert.fixtureId,
      minute: alert.minute,
      alert_kind: alert.kind,
      priority: alert.priority,
      headline: alert.headline.slice(0, 500),
      narrative: alert.narrative.slice(0, 1200),
      context_score: alert.contextScore,
      alert_fingerprint: fp,
      metadata_json: {
        contextLevel: alert.contextLevel,
        situacao: alert.situacao,
        acao: alert.acao,
        escalated: alert.escalated,
      },
    });
  }

  return rows;
}

export async function persistAutonomousAlerts(): Promise<number> {
  const config = getPersistenceConfig();
  if (config.sandbox) return 0;

  const rows = buildAutonomousAlertRows();
  return batchUpsertIgnoreDuplicates(
    "autonomous_alerts",
    rows,
    "fixture_id,alert_fingerprint",
    config.batchSize
  );
}
