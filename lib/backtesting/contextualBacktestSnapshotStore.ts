import type { ContextualBacktestSnapshot } from "@/lib/backtesting/backtest.types";

declare global {
  // eslint-disable-next-line no-var
  var __GP_CONTEXTUAL_BACKTEST__: { snapshot: ContextualBacktestSnapshot | null } | undefined;
}

export function setContextualBacktestSnapshot(snapshot: ContextualBacktestSnapshot): void {
  if (!globalThis.__GP_CONTEXTUAL_BACKTEST__) {
    globalThis.__GP_CONTEXTUAL_BACKTEST__ = { snapshot: null };
  }
  globalThis.__GP_CONTEXTUAL_BACKTEST__.snapshot = snapshot;
}

export function getContextualBacktestSnapshot(): ContextualBacktestSnapshot | null {
  return globalThis.__GP_CONTEXTUAL_BACKTEST__?.snapshot ?? null;
}
