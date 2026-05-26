export type GPIClassification =
  | "neutro"
  | "monitoramento"
  | "aceleracao"
  | "zona_critica"
  | "ruptura_ofensiva_provavel";

export type GPITrend = "subindo" | "estavel" | "caindo";

export interface GPIBreakdown {
  pressure: number;
  momentum: number;
  contextual: number;
  predictive: number;
  ev: number;
  adaptive: number;
  autonomous: number;
  territorial: number;
  risk: number;
}

export interface GPIResult {
  fixtureId: string;
  matchId: string;
  matchLabel: string;
  league: string;
  minute: number;
  score: number;
  classification: GPIClassification;
  classificationLabel: string;
  narrative: string;
  intensity: string;
  trend: GPITrend;
  trendLabel: string;
  breakdown: GPIBreakdown;
  generatedAt: string;
}

export interface GPIHistoryPoint {
  minute: number;
  score: number;
  recordedAt: string;
}

export interface GPIEngineSnapshot {
  generatedAt: string;
  enabled: boolean;
  sandboxMode: boolean;
  readings: GPIResult[];
  topFixture: GPIResult | null;
  alertsTriggered: number;
  metrics: {
    fixturesTracked: number;
    avgScore: number;
    highGpiCount: number;
  };
}

export type GPIAlertKind = "gpi_extremo" | "gpi_subida_rapida" | "gpi_queda_brusca";

export interface GPIAlertEvent {
  kind: GPIAlertKind;
  fixtureId: string;
  matchLabel: string;
  score: number;
  delta: number;
  narrative: string;
  createdAt: string;
}
