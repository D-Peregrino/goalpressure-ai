import type { ModelComparisonDocument } from "@/lib/analytics/modelComparison";
import type { ModelRecommendationsDocument } from "@/lib/analytics/modelRecommendations";
import type { ExperimentalSignalsDocument } from "@/lib/experimental/experimentalSignalEngine";

export type ResearchSourceStatus = "READY" | "PARTIAL" | "EMPTY";

export interface ResearchApiMeta {
  fetchedAt: string;
  responseTimeMs: number;
  sourceStatus: ResearchSourceStatus;
  hasComparison: boolean;
  hasExperimental: boolean;
  hasRecommendations: boolean;
}

export interface ResearchApiSuccessResponse {
  ok: true;
  modelComparison: ModelComparisonDocument | null;
  experimental: ExperimentalSignalsDocument | null;
  recommendations: ModelRecommendationsDocument | null;
  meta: ResearchApiMeta;
}

export interface ResearchApiErrorResponse {
  ok: false;
  error: { message: string };
  modelComparison: null;
  experimental: null;
  recommendations: null;
  meta: {
    fetchedAt: string;
    responseTimeMs: number;
    sourceStatus: "EMPTY";
  };
}

export type ResearchApiResponse =
  | ResearchApiSuccessResponse
  | ResearchApiErrorResponse;
