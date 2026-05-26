export type SharedSignalType = "reading" | "context" | "rupture" | "watch";

export type SignalVoteType = "validate" | "useful" | "caution";

export interface SharedSignal {
  id: string;
  userId: string;
  operatorName: string;
  fixtureId: string;
  matchLabel: string;
  league: string | null;
  signalType: SharedSignalType;
  body: string;
  minute: number | null;
  pressureScore: number | null;
  gpiScore: number | null;
  validateCount: number;
  usefulCount: number;
  createdAt: string;
}

export interface OperatorProfile {
  userId: string;
  displayName: string;
  reputationScore: number;
  precisionScore: number;
  anticipationScore: number;
  participationScore: number;
  falsePositiveRate: number;
  reliabilityScore: number;
  signalsCount: number;
  votesReceived: number;
  rank?: number;
}

export interface CollectiveContext {
  fixtureId: string;
  matchLabel: string;
  league: string | null;
  observerCount: number;
  consensusScore: number;
  collectivePressure: number;
  traits: Record<string, unknown>;
  updatedAt: string;
}

export interface NetworkTimelineEntry {
  id: string;
  fixtureId: string;
  eventType: string;
  label: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface NetworkFeedPayload {
  signals: SharedSignal[];
  consensus: CollectiveContext[];
  timeline: NetworkTimelineEntry[];
  heatmap: CollectiveHeatCell[];
  operators: OperatorProfile[];
}

export interface CollectiveHeatCell {
  fixtureId: string;
  matchLabel: string;
  league: string | null;
  observerCount: number;
  consensusScore: number;
  collectivePressure: number;
}

export interface PostSignalInput {
  fixtureId: string;
  matchLabel: string;
  league?: string;
  signalType: SharedSignalType;
  body: string;
  minute?: number;
  pressureScore?: number;
  gpiScore?: number;
}

export interface PostVoteInput {
  signalId: string;
  vote: SignalVoteType;
}
