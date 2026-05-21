import type { PlayerOpsSnapshot } from "@/lib/player/playerSnapshot";
import type { PlayerImpactResult, PlayerRuntimeMetricsRow } from "@/types/player";

export interface PlayerRuntimeSuccessResponse {
  ok: true;
  snapshot: PlayerOpsSnapshot | null;
  live: PlayerImpactResult[];
  rows: PlayerRuntimeMetricsRow[];
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    count: number;
  };
}

export interface PlayerRuntimeErrorResponse {
  ok: false;
  error: { message: string };
}

export type PlayerRuntimeApiResponse =
  | PlayerRuntimeSuccessResponse
  | PlayerRuntimeErrorResponse;
