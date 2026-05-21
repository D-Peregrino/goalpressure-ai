/**
 * GoalPressure AI — player impact types.
 */

export type PlayerPosition =
  | "GK"
  | "DEF"
  | "MID"
  | "FWD"
  | "UNKNOWN";

export type CardType = "YELLOW" | "RED" | "NONE";

export interface PlayerLineupEntry {
  playerId: string;
  name: string;
  position: PlayerPosition;
  rating?: number;
  xgContribution?: number;
  shots?: number;
  assists?: number;
  keyPasses?: number;
  defensiveActions?: number;
  goalkeeperSaves?: number;
  sprintLoad?: number;
  fatigue?: number;
  cards?: CardType;
  isStarter?: boolean;
  minutesPlayed?: number;
}

export interface PlayerSubstitution {
  playerOutId: string;
  playerInId: string;
  playerIn?: PlayerLineupEntry;
  minute: number;
  side: "home" | "away";
}

export interface PlayerImpactInput {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  lineups: {
    home: PlayerLineupEntry[];
    away: PlayerLineupEntry[];
  };
  substitutions?: PlayerSubstitution[];
  homeRedCards?: number;
  awayRedCards?: number;
}

export interface PlayerImpactResult {
  fixtureId: string;
  matchId?: string;
  matchLabel?: string;
  minute: number;
  offensiveImpact: number;
  defensiveImpact: number;
  chaosContribution: number;
  fatigueImpact: number;
  clutchFactor: number;
  goalkeeperResistance: number;
  substitutionSwing: number;
  redCardImpact: number;
  playerVolatility: number;
  teamSynergyShift: number;
  flags: string[];
  topClutchPlayer?: string;
  topFatigueAlert?: string;
  topChaosContributor?: string;
  computedAt: string;
}

export interface PlayerRuntimeMetricsRow {
  id?: string;
  fixture_id: string;
  minute: number;
  offensive_impact: number;
  defensive_impact: number;
  chaos_contribution: number;
  fatigue_impact: number;
  clutch_factor: number;
  goalkeeper_resistance: number;
  substitution_swing: number;
  red_card_impact: number;
  player_volatility: number;
  team_synergy_shift: number;
  metadata?: Record<string, unknown>;
  created_at?: string;
}
