import type { ActivityEntry } from "@/lib/workspace/types";
import { WORKSPACE_LIMITS } from "@/lib/workspace/types";

export function pushActivity(
  log: ActivityEntry[],
  entry: Omit<ActivityEntry, "id" | "ts"> & { ts?: number }
): ActivityEntry[] {
  const item: ActivityEntry = {
    ...entry,
    id: `${entry.type}_${Date.now()}`,
    ts: entry.ts ?? Date.now(),
  };
  return [item, ...log].slice(0, WORKSPACE_LIMITS.activityLog);
}
