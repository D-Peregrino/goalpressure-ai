import type { MarketType, Signal } from "@/types/domain";
import type { Match } from "@/types/domain";

export type DispatchUrgency = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type DispatchRoute =
  | "hero"
  | "terminal_feed"
  | "telegram"
  | "push";

export type DispatchSignalSource =
  | "PRESSURE_ENGINE"
  | "EV_ENGINE"
  | "OPS_LAYER"
  | "LEARNING_LAYER"
  | "DOMAIN_SIGNAL";

export interface DispatchCandidate {
  id: string;
  fixtureId: string;
  matchId: string;
  matchLabel: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  signalType: string;
  market: MarketType | string;
  source: DispatchSignalSource;
  minute: number;
  pressureScore: number;
  momentumScore: number;
  chaosLevel: number;
  accelerationScore: number;
  evPercent: number | null;
  fairOdd: number | null;
  marketOdd: number | null;
  confidence: number;
  gameState: string | null;
  temperature: string | null;
  riskContext: string | null;
  narrative: string;
  headline: string;
  scoreDisplay: string;
  domainSignal?: Signal;
}

export interface QueuedDispatch extends DispatchCandidate {
  urgency: DispatchUrgency;
  priorityScore: number;
  routes: DispatchRoute[];
  queuedAt: string;
}

export interface ExecutedDispatch extends QueuedDispatch {
  dispatchedAt: string;
  telegramSent: boolean;
  pushSent: boolean;
  message: string;
}

export interface DispatchEngineSnapshot {
  generatedAt: string;
  activeSignals: number;
  queueSize: number;
  criticalCount: number;
  telegramSentCount: number;
  pushSentCount: number;
  dispatchRatePerHour: number;
  avgEvPercent: number;
  primaryFixtureId: string | null;
  feed: ExecutedDispatch[];
  queue: QueuedDispatch[];
  monitoredFixtures: string[];
}

export interface ExecutionDispatcherInput {
  matches: Match[];
  signals: Signal[];
  enableTelegram?: boolean;
  enablePush?: boolean;
}

export interface ExecutionDispatcherResult {
  snapshot: DispatchEngineSnapshot;
  executed: number;
  skippedDedup: number;
  skippedCooldown: number;
}

export type PushNotificationKind =
  | "pressure_spike"
  | "ev_extreme"
  | "late_goal"
  | "operational_focus"
  | "ignite_match";

export interface PushNotificationPayload {
  id: string;
  kind: PushNotificationKind;
  title: string;
  body: string;
  fixtureId: string;
  urgency: DispatchUrgency;
  createdAt: string;
}
