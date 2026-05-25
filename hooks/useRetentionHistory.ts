"use client";

import { useUserWorkspace } from "@/hooks/useUserWorkspace";

export type { RecentOpportunity } from "@/lib/workspace/types";

/** Histórico de retenção — delegado ao workspace global do usuário. */
export function useRetentionHistory() {
  const ws = useUserWorkspace();
  return {
    recent: ws.recent,
    saved: ws.saved,
    watched: ws.watched,
    recordOpportunity: ws.recordOpportunity,
    saveOpportunity: ws.saveOpportunity,
    recordAlert: ws.recordAlert,
    markWatched: ws.markWatched,
    readingHistory: ws.readingHistory,
    recordReading: ws.recordReading,
  };
}
