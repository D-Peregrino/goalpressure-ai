import type { MarketType } from "@/types/domain";
import type { TelegramSignalSource } from "@/types/telegram";

export type OpsDispatchStatus =
  | "queued"
  | "dispatched"
  | "sandbox"
  | "failed"
  | "skipped"
  | "cooldown";

export type OpsLogLevel = "info" | "warn" | "error";

export type OpsEventType =
  | "queued"
  | "dispatched"
  | "telegram_sent"
  | "telegram_failed"
  | "skipped_duplicate"
  | "cooldown_blocked"
  | "failed"
  | "sandbox_dispatch"
  | string;

export interface OpsDispatchRecord {
  signalId: string;
  modelId: string;
  source: TelegramSignalSource;
  matchId: string;
  market: MarketType;
  timestamp: string;
  status: OpsDispatchStatus;
  latencyMs?: number;
  error?: string;
}

export interface OpsLogEntry {
  id: string;
  timestamp: string;
  level: OpsLogLevel;
  event: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface OpsQueueMetrics {
  queueSize: number;
  processing: boolean;
  cooldownEntries: number;
}

export interface OpsCounterMetrics {
  totalQueued: number;
  totalDispatched: number;
  duplicateSkips: number;
  cooldownBlocked: number;
  sendSuccess: number;
  sendFailed: number;
  sandboxDispatches: number;
  dispatchRatePerMin: number;
  failRate: number;
  averageLatencyMs?: number;
  runtimeCycles?: number;
  pollingSuccess?: number;
  pollingFailures?: number;
}

export interface OpsTelegramStatus {
  sandboxMode: boolean;
  configured: boolean;
  connected: boolean;
  status: "SANDBOX" | "READY" | "OFFLINE" | "ONLINE";
  botTokenSet: boolean;
  chatIdSet: boolean;
  lastDispatch: string | null;
  averageLatencyMs: number;
  totalSent: number;
  totalFailed: number;
}

export interface OpsLivePressureMetric {
  fixtureId: string;
  matchLabel: string;
  minute: number;
  homePressure: number;
  awayPressure: number;
  pressureScore: number;
  momentum: number;
  goalProbability: number;
  confidence: number;
}

export interface OpsLivePressureSnapshot {
  updatedAt: string | null;
  matchCount: number;
  topPressure: OpsLivePressureMetric | null;
  metrics: OpsLivePressureMetric[];
}

export interface OpsActiveSignal {
  fixtureId: string;
  matchLabel: string;
  minute: number;
  market: string;
  pressureScore: number;
  momentum: number;
  ev: number;
  confidence: number;
  urgency: number;
}

export interface OpsBacktestSnapshot {
  updatedAt: string | null;
  roi: number;
  hitRate: number;
  averageEv: number;
  profitUnits: number;
  maxDrawdown: number;
  winStreak: number;
  loseStreak: number;
  totalSignals: number;
  wins: number;
  losses: number;
  sharpeLikeRatio: number;
}

export interface OpsSignalDecisionSnapshot {
  updatedAt: string | null;
  evaluated: number;
  triggered: number;
  dispatched: number;
  blocked: number;
  averageEv: number;
  approvalRate: number;
  activeSignals: OpsActiveSignal[];
}

export interface OpsMarketCalibrationSnapshot {
  updatedAt: string | null;
  calibrated: number;
  averageEdge: number;
  strongestEdgeFixture: string | null;
  strongestEdgePercent: number;
  closingLineEfficiency: number;
  marketDrift: number;
  sharpPressure: number;
  steamMoves: number;
  topEdges: {
    fixtureId: string;
    matchLabel?: string;
    market: string;
    edgePercent: number;
    classification: string;
    expectedValue: number;
  }[];
}

export interface OpsTemporalSnapshot {
  updatedAt: string | null;
  matchCount: number;
  averageChaos: number;
  averageAcceleration: number;
  averageUrgency: number;
  averageVolatility: number;
  criticalCount: number;
  highPriorityCount: number;
  chaosMap: {
    fixtureId: string;
    matchLabel?: string;
    minute: number;
    chaosIndex: number;
    executionPriority: string;
    matchPhase: string;
  }[];
}

export interface OpsMicroeventSnapshot {
  updatedAt: string | null;
  matchCount: number;
  averageMicroeventScore: number;
  chaosBursts: {
    fixtureId: string;
    matchLabel?: string;
    chaosBurst: number;
    microeventScore: number;
  }[];
  territorialPressure: {
    fixtureId: string;
    matchLabel?: string;
    territorialDominance: number;
  }[];
  attackWaves: {
    fixtureId: string;
    matchLabel?: string;
    attackWaveIntensity: number;
  }[];
  collapseAlerts: {
    fixtureId: string;
    matchLabel?: string;
    collapseProbability: number;
  }[];
  emotionalTilt: {
    fixtureId: string;
    matchLabel?: string;
    emotionalTilt: number;
  }[];
  topTriggerWindows: {
    fixtureId: string;
    matchLabel?: string;
    triggerWindow: string;
    microeventScore: number;
  }[];
}

export interface OpsSequenceMemorySnapshot {
  updatedAt: string | null;
  matchCount: number;
  averageRecurrenceScore: number;
  recurrenceLeaders: {
    fixtureId: string;
    matchLabel?: string;
    recurrenceScore: number;
    sequenceState: string;
  }[];
  offensiveCycles: {
    fixtureId: string;
    matchLabel?: string;
    offensiveCycleStrength: number;
  }[];
  fakeMomentumAlerts: {
    fixtureId: string;
    matchLabel?: string;
    fakeMomentumProbability: number;
  }[];
  collapseCycles: {
    fixtureId: string;
    matchLabel?: string;
    collapseCycleProbability: number;
  }[];
  dominanceCurves: {
    fixtureId: string;
    matchLabel?: string;
    lateGameDominance: number;
  }[];
  sustainedChaos: {
    fixtureId: string;
    matchLabel?: string;
    sustainedChaosLevel: number;
    sequenceState: string;
  }[];
}

export interface OpsPlayerImpactSnapshot {
  updatedAt: string | null;
  matchCount: number;
  topClutchPlayers: {
    name: string;
    fixtureId: string;
    clutchFactor: number;
  }[];
  fatigueAlerts: {
    name: string;
    fixtureId: string;
    fatigueImpact: number;
  }[];
  goalkeeperResistance: {
    fixtureId: string;
    matchLabel?: string;
    value: number;
  }[];
  substitutionImpacts: {
    fixtureId: string;
    matchLabel?: string;
    swing: number;
  }[];
  chaosContributors: {
    name: string;
    fixtureId: string;
    chaos: number;
  }[];
}

export interface OpsApiSuccessResponse {
  ok: true;
  telegram: OpsTelegramStatus;
  queue: OpsQueueMetrics;
  counters: OpsCounterMetrics;
  recentDispatches: OpsDispatchRecord[];
  logs: OpsLogEntry[];
  livePressure: OpsLivePressureSnapshot;
  signalDecision: OpsSignalDecisionSnapshot;
  backtest: OpsBacktestSnapshot;
  marketCalibration: OpsMarketCalibrationSnapshot;
  temporal: OpsTemporalSnapshot;
  playerImpact: OpsPlayerImpactSnapshot;
  microevent: OpsMicroeventSnapshot;
  sequenceMemory: OpsSequenceMemorySnapshot;
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    historyUpdatedAt: string | null;
  };
}

export interface OpsApiErrorResponse {
  ok: false;
  error: { message: string };
}

export type OpsApiResponse = OpsApiSuccessResponse | OpsApiErrorResponse;
