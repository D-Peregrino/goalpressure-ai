import type { ActiveDataSource } from "@/lib/data-source/config";

export type LiveFetchTelemetry = {
  activeSource: ActiveDataSource;
  sportmonksTokenConfigured: boolean;
  seedEnabled: boolean;
  lastFetchAt: string | null;
  lastFetchStatus: number | null;
  lastFetchEndpoint: string | null;
  matchCount: number;
  error: string | null;
  httpStatus: number | null;
};

let telemetry: LiveFetchTelemetry = {
  activeSource: "none",
  sportmonksTokenConfigured: false,
  seedEnabled: false,
  lastFetchAt: null,
  lastFetchStatus: null,
  lastFetchEndpoint: null,
  matchCount: 0,
  error: null,
  httpStatus: null,
};

export function recordLiveFetchTelemetry(
  patch: Partial<LiveFetchTelemetry> & Pick<LiveFetchTelemetry, "activeSource">
): LiveFetchTelemetry {
  telemetry = { ...telemetry, ...patch };
  return { ...telemetry };
}

export function getLiveFetchTelemetry(): LiveFetchTelemetry {
  return { ...telemetry };
}
