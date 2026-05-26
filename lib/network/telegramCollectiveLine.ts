import type { CollectiveContext } from "@/lib/network/network.types";
import { isNetworkEngineEnabled } from "@/lib/network/networkConfig";
import { watchlistObserverLabel } from "@/lib/network/sharedWatchlists";

/**
 * Linha opcional para mensagens — não altera telegramLiveEngine.
 * Use apenas quando integração explícita for desejada.
 */
export function formatCollectiveMonitorLine(context: CollectiveContext | null): string | null {
  if (!isNetworkEngineEnabled() || !context) return null;
  if (context.observerCount < 2 && context.consensusScore < 50) return null;

  return (
    `Contexto monitorado coletivamente — ${context.observerCount} observadores · ` +
    `consenso ${context.consensusScore} · ${watchlistObserverLabel(context.observerCount)}`
  );
}
