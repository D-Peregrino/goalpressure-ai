import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import type { ModelComparisonDocument } from "@/lib/analytics/modelComparison";
import type { ModelRecommendationsDocument } from "@/lib/analytics/modelRecommendations";
import type { ExperimentalSignalsDocument } from "@/lib/experimental/experimentalSignalEngine";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type { ResearchApiResponse, ResearchApiSuccessResponse } from "@/types/researchApi";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_SCOPE = "api/research";
const ANALYTICS_DIR = path.join(process.cwd(), "data", "analytics");
const EXPERIMENTAL_DIR = path.join(process.cwd(), "data", "experimental");

const PATHS = {
  comparison: path.join(ANALYTICS_DIR, "model-comparison.json"),
  recommendations: path.join(ANALYTICS_DIR, "model-recommendations.json"),
  experimental: path.join(EXPERIMENTAL_DIR, "experimental-signals.json"),
} as const;

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as NodeJS.ErrnoException).code)
        : "";
    if (code === "ENOENT") return null;
    throw error;
  }
}

export async function GET(): Promise<NextResponse<ResearchApiResponse>> {
  const startedAt = Date.now();

  try {
    const [modelComparison, experimental, recommendations] = await Promise.all([
      readJsonFile<ModelComparisonDocument>(PATHS.comparison),
      readJsonFile<ExperimentalSignalsDocument>(PATHS.experimental),
      readJsonFile<ModelRecommendationsDocument>(PATHS.recommendations),
    ]);

    const hasComparison = Boolean(modelComparison);
    const hasExperimental = Boolean(experimental);
    const hasRecommendations = Boolean(recommendations);

    const sourceStatus =
      hasComparison || hasExperimental
        ? hasComparison && hasExperimental
          ? "READY"
          : "PARTIAL"
        : "EMPTY";

    const body: ResearchApiSuccessResponse = {
      ok: true,
      modelComparison,
      experimental,
      recommendations,
      meta: {
        fetchedAt: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
        sourceStatus,
        hasComparison,
        hasExperimental,
        hasRecommendations,
      },
    };

    logInfo(ROUTE_SCOPE, "Research payload served", {
      sourceStatus,
      modelsInComparison: modelComparison?.models.length ?? 0,
      experimentalModels: experimental?.models.length ?? 0,
    });

    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logWarn(ROUTE_SCOPE, "Research read failed", { message });

    return NextResponse.json(
      {
        ok: false,
        error: { message },
        modelComparison: null,
        experimental: null,
        recommendations: null,
        meta: {
          fetchedAt: new Date().toISOString(),
          responseTimeMs: Date.now() - startedAt,
          sourceStatus: "EMPTY",
        },
      },
      { status: 500 }
    );
  }
}
