export {
  calculatePressureScore,
  calculateFixtureTeamPressures,
  applyQuantitativePressureToMatch,
  type QuantitativePressureResult,
  type FixtureTeamPressure,
} from "@/lib/engine/pressureScore";

export {
  calculatePressureScore as calculateLegacyPressureScore,
  applyPressureResultToMatch,
  classifyPressureLevel,
  pressureLevelToConfidence,
} from "@/lib/engine/pressure/pressureCalculator";

export { computeRollingWindowStats, recordMatchTick } from "@/lib/engine/pressure/rollingWindow";
export { calculateLiveMomentum } from "@/lib/engine/momentum/liveMomentum";
export {
  calculateExpectedValue,
  hasPositiveEV,
} from "@/lib/engine/ev/expectedValue";
export { generateLiveSignals, buildMatchEngineInsight } from "@/lib/engine/signals/liveSignalGenerator";
export {
  evaluateSignalOpportunity,
  metricsFromLiveRecord,
  SIGNAL_DECISION_THRESHOLDS,
  type SignalDecisionMetrics,
  type SignalOpportunityEvaluation,
} from "@/lib/engine/signalDecisionEngine";

export { processLiveEngineBatch, getLatestEngineSnapshot } from "@/lib/engine/liveEnginePipeline";
export {
  getLiveEngineSnapshot,
  setLiveEngineSnapshot,
} from "@/lib/engine/engineSnapshotStore";
export {
  enqueueLiveDispatchBatch,
  getLiveDispatchQueueSize,
} from "@/lib/engine/telegram/liveDispatchQueue";
