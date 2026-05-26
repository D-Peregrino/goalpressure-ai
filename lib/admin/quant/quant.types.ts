export interface QuantDistributionBucket {
  label: string;
  count: number;
  sharePct: number;
}

export interface QuantHeatmapCell {
  key: string;
  label: string;
  value: number;
  intensity: number;
}

export interface QuantTimelinePoint {
  at: string;
  gpi: number;
  predictive: number;
  contextual: number;
  adaptive: number;
  thresholdContext: number;
}

export interface QuantGpiAnalytics {
  avgScore: number;
  distribution: QuantDistributionBucket[];
  ruptureRateByBand: { band: string; ratePct: number; samples: number }[];
  avgTimingMinutes: number;
  falsePositivePct: number;
  operationalEffectivenessPct: number;
  highGpiCount: number;
}

export interface QuantLeagueRow {
  league: string;
  reliability: number;
  chaos: number;
  contextualEv: number;
  marketLag: number;
  predictability: number;
  samples: number;
}

export interface QuantPatternRow {
  id: string;
  label: string;
  effectivenessPct: number;
  falsePositivePct: number;
  frequency: number;
  combo?: string;
}

export interface QuantOperationalEfficiency {
  alertsSent: number;
  alertsBlocked: number;
  telegramEstimate: number;
  avgAnticipationMin: number;
  validMonitorings: number;
  contextualPrecisionPct: number;
}

export interface QuantOverviewResponse {
  ok: boolean;
  generatedAt: string;
  gpi: QuantGpiAnalytics;
  operational: QuantOperationalEfficiency;
  heatmaps: {
    byHour: QuantHeatmapCell[];
    byMinute: QuantHeatmapCell[];
    byLeague: QuantHeatmapCell[];
    byIntensity: QuantHeatmapCell[];
  };
  timeline: QuantTimelinePoint[];
  topLeagues: QuantLeagueRow[];
  strongPatterns: QuantPatternRow[];
  weakPatterns: QuantPatternRow[];
  predictiveAccuracyPct: number;
  falsePositivePct: number;
}

export interface QuantGpiResponse {
  ok: boolean;
  generatedAt: string;
  analytics: QuantGpiAnalytics;
  readings: { fixtureId: string; matchLabel: string; score: number; classification: string }[];
}

export interface QuantLeaguesResponse {
  ok: boolean;
  generatedAt: string;
  leagues: QuantLeagueRow[];
}

export interface QuantPatternsResponse {
  ok: boolean;
  generatedAt: string;
  strong: QuantPatternRow[];
  weak: QuantPatternRow[];
  combos: QuantPatternRow[];
}
