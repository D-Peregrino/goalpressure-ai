let falsePositiveEvents = 0;
let totalHighConfidenceEvents = 0;
let marketLagConfirmed = 0;
let marketLagSignals = 0;

export function ingestAutonomousMetrics(blocked: number, sent: number): void {
  totalHighConfidenceEvents += sent + blocked;
  falsePositiveEvents += blocked;
}

export function ingestPredictiveMetrics(
  falsePositives: number,
  validAnticipations: number
): void {
  falsePositiveEvents += falsePositives;
  totalHighConfidenceEvents += validAnticipations + falsePositives;
}

export function recordMarketLagSignal(confirmed: boolean): void {
  marketLagSignals += 1;
  if (confirmed) marketLagConfirmed += 1;
}

export function getFalsePositivePct(): number {
  if (totalHighConfidenceEvents === 0) return 0;
  return Math.round((falsePositiveEvents / totalHighConfidenceEvents) * 1000) / 10;
}

export function getMarketLagConfirmedPct(): number {
  if (marketLagSignals === 0) return 0;
  return Math.round((marketLagConfirmed / marketLagSignals) * 1000) / 10;
}

export function resetCycleCounters(): void {
  /* mantém acumulado — não reset */
}
