/**
 * GoalPressure AI — domain model
 * Central source of truth for types shared across UI, hooks, engine, and data layers.
 * Prepared for Sportmonks, WebSocket, Supabase, and API routes.
 */

// ─── Identifiers ─────────────────────────────────────────────────────────────

export type MatchId = string;
export type TeamId = string;

// ─── Team ────────────────────────────────────────────────────────────────────

export interface Team {
  id: TeamId;
  name: string;
}

// ─── Markets & confidence ────────────────────────────────────────────────────

/** Markets supported by the signal engine */
export type MarketType = "OVER_0_5" | "OVER_1_5";

export const MARKET_LABELS: Record<MarketType, string> = {
  OVER_0_5: "Over 0.5 Goal",
  OVER_1_5: "Over 1.5 Goals",
} as const;

/** Confidence assigned to a validated engine signal */
export type SignalConfidence = "MEDIUM" | "HIGH";

/** Pressure band used for UI tiers and future analytics */
export type PressureConfidence = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type PressureTier = "low" | "medium" | "high";

export type PressureTrend = "STABLE" | "RISING" | "FALLING";

/** Fixture lifecycle (normalized from provider state) */
export type MatchStatus =
  | "NOT_STARTED"
  | "LIVE"
  | "HALFTIME"
  | "FINISHED"
  | "POSTPONED"
  | "CANCELLED"
  | "UNKNOWN";

export interface MatchScore {
  home: number;
  away: number;
}

// ─── Engine & infrastructure status ────────────────────────────────────────

export type EngineStatus =
  | "ONLINE"
  | "OFFLINE"
  | "DEGRADED"
  | "ACTIVE"
  | "STANDBY";

export type ServiceState = "ONLINE" | "ACTIVE" | "STANDBY" | "OFFLINE";

export interface ServiceStatus {
  name: string;
  state: ServiceState;
}

// ─── Match statistics & odds ─────────────────────────────────────────────────

export interface MatchStats {
  /** Total shot attempts (both teams aggregated for pressure index) */
  shots: number;
  /** Shots on target — estimated from shots when missing at ingest */
  shotsOnTarget: number;
  dangerousAttacks: number;
  corners: number;
  /** Expected goals (SportMonks or estimated) */
  xG?: number;
  /** Offensive possession % proxy (0–100) */
  possession?: number;
}

export interface Odds {
  /** Primary display odd (feeds legacy single-odd views) */
  primary: number;
  over05: number;
  over15: number;
}

// ─── Pressure ────────────────────────────────────────────────────────────────

export interface PressureSnapshot {
  /** Normalized offensive pressure index (0–100) */
  score: number;
  /** Epoch ms when the snapshot was captured (future live feeds) */
  capturedAt?: number;
  /** UI tier derived from score (optional until pressure engine runs) */
  tier?: PressureTier;
  /** Short-term momentum vs previous snapshot */
  trend?: PressureTrend;
}

// ─── Match ───────────────────────────────────────────────────────────────────

export interface Match {
  id: MatchId;
  league: string;
  homeTeam: string;
  awayTeam: string;
  minute: number;
  stats: MatchStats;
  odds: Odds;
  pressure: PressureSnapshot;
  /** Normalized fixture status (Sportmonks, WebSocket, etc.) */
  status?: MatchStatus;
  /** Current match scoreline */
  score?: MatchScore;
  /** Sportmonks (or other provider) fixture id */
  externalId?: string;
  /** Last upstream sync — epoch ms */
  updatedAt?: number;
}

// ─── Signal ──────────────────────────────────────────────────────────────────

export interface Signal {
  matchId: MatchId;
  matchLabel: string;
  market: MarketType;
  confidence: SignalConfidence;
  reason: string;
  stake: number;
  pressureScore: number;
  odd: number;
}

export interface SignalEvaluation {
  shouldSignal: boolean;
  signal: Signal | null;
  matchId: MatchId;
  pressureScore: number;
}

// ─── Domain helpers ──────────────────────────────────────────────────────────

export function getMatchLabel(
  match: Pick<Match, "homeTeam" | "awayTeam">
): string {
  return `${match.homeTeam} vs ${match.awayTeam}`;
}

export function getMarketLabel(market: MarketType): string {
  return MARKET_LABELS[market];
}

export function deriveSignalConfidence(
  pressureScore: number
): SignalConfidence | null {
  if (pressureScore >= 80) return "HIGH";
  if (pressureScore >= 70) return "MEDIUM";
  return null;
}

export function deriveStake(confidence: SignalConfidence): number {
  return confidence === "HIGH" ? 1 : 0.5;
}

export function getPressureTier(score: number): PressureTier {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  return "low";
}

/** Flat view model for live match cards (keeps presentational props stable) */
export interface LiveMatchView {
  id: MatchId;
  league: string;
  homeTeam: string;
  awayTeam: string;
  minute: number;
  pressureScore: number;
  shots: number;
  dangerousAttacks: number;
}

export function toLiveMatchView(match: Match): LiveMatchView {
  return {
    id: match.id,
    league: match.league,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    minute: match.minute,
    pressureScore: match.pressure.score,
    shots: match.stats.shots,
    dangerousAttacks: match.stats.dangerousAttacks,
  };
}
