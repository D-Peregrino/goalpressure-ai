export type OpsTimelineKind =
  | "gpi"
  | "pressure"
  | "telegram"
  | "consensus"
  | "goal"
  | "network"
  | "market";

export type OpsTimelineSeverity = "low" | "medium" | "high";

export interface OpsCenterHero {
  monitoredMatches: number;
  activeAlerts: number;
  avgGpi: number;
  collectivePressure: number;
  consensusScore: number;
}

export interface OpsMatchSlot {
  fixtureId: string;
  matchLabel: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
  isLive: boolean;
  pressureScore: number;
  gpiScore: number | null;
  consensusScore: number | null;
  priorityScore: number;
  evContext: number | null;
  oddsLag: boolean;
  ignoredByMarket: boolean;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  /** SportMonks feed density flags for OPS prioritization. */
  sportmonksFeedScore?: number;
  commentaryAvailable?: boolean;
  advancedOddsAvailable?: boolean;
}

export interface OpsTimelineEvent {
  id: string;
  at: string;
  kind: OpsTimelineKind;
  label: string;
  fixtureId?: string;
  severity: OpsTimelineSeverity;
}

export interface OpsRadarCell {
  fixtureId: string;
  matchLabel: string;
  league: string;
  criticality: number;
  pressureScore: number;
  gpiScore: number | null;
  observerCount: number;
  collectivePressure: number;
}

export interface MarketDistortionItem {
  fixtureId: string;
  matchLabel: string;
  market: string;
  edgePercent: number;
  ev: number;
  laggedOdds: boolean;
  ignored: boolean;
  classification: string;
}

export interface OpsTacticalReplayItem {
  fixtureId: string;
  matchLabel: string;
  minute: number;
  note: string;
}

export interface OpsCenterPayload {
  hero: OpsCenterHero;
  matches: OpsMatchSlot[];
  timeline: OpsTimelineEvent[];
  radar: OpsRadarCell[];
  distortions: MarketDistortionItem[];
  hotLeagues: { league: string; heat: number }[];
  tacticalReplay: OpsTacticalReplayItem[];
  sandbox: boolean;
  updatedAt: string;
}

export type OpsMultiViewCount = 1 | 2 | 4;
