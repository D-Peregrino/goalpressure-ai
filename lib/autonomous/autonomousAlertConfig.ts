import type { AutonomousAlertPriority } from "@/lib/autonomous/autonomousAlert.types";

function parseBool(value: string | undefined, defaultValue: boolean): boolean {
  if (value == null || value.trim() === "") return defaultValue;
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

const PRIORITY_RANK: Record<AutonomousAlertPriority, number> = {
  baixa: 1,
  moderada: 2,
  alta: 3,
  critica: 4,
};

export function getAutonomousAlertConfig() {
  const enabled = parseBool(process.env.AUTONOMOUS_ALERTS_ENABLED, true);
  const sandbox = parseBool(process.env.AUTONOMOUS_ALERTS_SANDBOX, false);
  const minLevel = (process.env.AUTONOMOUS_MIN_ALERT_LEVEL?.trim().toLowerCase() ??
    "moderada") as AutonomousAlertPriority;

  return {
    enabled,
    sandbox,
    minPriorityRank: PRIORITY_RANK[minLevel] ?? PRIORITY_RANK.moderada,
    minLevel,
  };
}

export function meetsMinAlertPriority(priority: AutonomousAlertPriority): boolean {
  const { minPriorityRank } = getAutonomousAlertConfig();
  return PRIORITY_RANK[priority] >= minPriorityRank;
}

export function priorityRank(priority: AutonomousAlertPriority): number {
  return PRIORITY_RANK[priority];
}
