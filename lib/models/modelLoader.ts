import activeManifestJson from "@/config/models/active-model.json";
import modelV1Json from "@/config/models/model-v1.json";
import { logInfo, logWarn } from "@/lib/utils/logger";
import type {
  ActiveModelManifest,
  LoadedActiveModel,
  QuantitativeModel,
} from "@/types/model";

const LOG_SCOPE = "model-loader";
const MODELS_DIR = "config/models";
const FALLBACK_MODEL_ID = "model-v1";

const BUNDLED_MODELS: Record<string, QuantitativeModel> = {
  [modelV1Json.modelId]: modelV1Json as QuantitativeModel,
};

let cachedModel: LoadedActiveModel | null = null;

export function parseQuantitativeModel(
  raw: unknown,
  source: string
): QuantitativeModel | null {
  return parseModel(raw, source);
}

function parseModel(raw: unknown, source: string): QuantitativeModel | null {
  if (!raw || typeof raw !== "object") return null;

  const candidate = raw as QuantitativeModel;
  const over05 = candidate.markets?.OVER_0_5;
  const over15 = candidate.markets?.OVER_1_5;

  if (
    !candidate.modelId ||
    !over05?.minMinute ||
    !over05?.minPressure ||
    !over05?.maxMinute ||
    !over15?.minMinute ||
    !over15?.minPressure ||
    !over15?.maxMinute
  ) {
    logWarn(LOG_SCOPE, "Invalid model schema — missing required fields", {
      source,
      modelId: candidate.modelId,
    });
    return null;
  }

  return candidate;
}

function readManifest(): ActiveModelManifest {
  if (typeof window === "undefined") {
    try {
      const path = require("path") as typeof import("path");
      const { existsSync, readFileSync } = require("fs") as typeof import("fs");
      const manifestPath = path.join(process.cwd(), MODELS_DIR, "active-model.json");
      if (existsSync(manifestPath)) {
        const raw = JSON.parse(
          readFileSync(manifestPath, "utf8")
        ) as ActiveModelManifest;
        if (raw.activeModelId) return raw;
      }
    } catch {
      // fall through to bundled manifest
    }
  }

  return activeManifestJson as ActiveModelManifest;
}

function readModelFromDisk(modelId: string): QuantitativeModel | null {
  if (typeof window !== "undefined") return null;

  try {
    const path = require("path") as typeof import("path");
    const { existsSync, readFileSync } = require("fs") as typeof import("fs");
    const modelPath = path.join(process.cwd(), MODELS_DIR, `${modelId}.json`);
    if (!existsSync(modelPath)) return null;

    const raw = JSON.parse(readFileSync(modelPath, "utf8"));
    return parseModel(raw, modelPath);
  } catch {
    return null;
  }
}

function resolveModel(modelId: string): QuantitativeModel | null {
  const fromDisk = readModelFromDisk(modelId);
  if (fromDisk) return fromDisk;

  const bundled = BUNDLED_MODELS[modelId];
  if (bundled) return bundled;

  return null;
}

function logThresholdsApplied(model: QuantitativeModel): void {
  logInfo(LOG_SCOPE, "Thresholds applied", {
    modelId: model.modelId,
    OVER_0_5: model.markets.OVER_0_5,
    OVER_1_5: model.markets.OVER_1_5,
  });
}

/**
 * Loads the active quantitative model from config/models/active-model.json
 * and config/models/{activeModelId}.json. Falls back to model-v1 when missing.
 */
export function loadActiveModel(): LoadedActiveModel {
  if (cachedModel) return cachedModel;

  const manifest = readManifest();
  const requestedModelId = manifest.activeModelId;
  const resolved = resolveModel(requestedModelId);

  if (resolved) {
    logInfo(LOG_SCOPE, "Active model loaded", {
      modelId: resolved.modelId,
      requestedModelId,
      description: resolved.description,
      source: readModelFromDisk(requestedModelId) ? "disk" : "bundled",
    });
    logThresholdsApplied(resolved);

    cachedModel = {
      model: resolved,
      usedFallback: false,
      requestedModelId,
    };
    return cachedModel;
  }

  const fallback = BUNDLED_MODELS[FALLBACK_MODEL_ID] ?? (modelV1Json as QuantitativeModel);

  logWarn(LOG_SCOPE, "Fallback model used", {
    requestedModelId,
    fallbackModelId: fallback.modelId,
  });

  logInfo(LOG_SCOPE, "Active model loaded", {
    modelId: fallback.modelId,
    requestedModelId,
    usedFallback: true,
  });
  logThresholdsApplied(fallback);

  cachedModel = {
    model: fallback,
    usedFallback: true,
    requestedModelId,
  };
  return cachedModel;
}

/** Clears in-memory cache (useful in tests or after config hot-reload). */
export function resetActiveModelCache(): void {
  cachedModel = null;
}

let cachedAllModels: QuantitativeModel[] | null = null;

/**
 * Loads every config/models/model-*.json for experimental A/B evaluation.
 */
export async function loadAllModels(): Promise<QuantitativeModel[]> {
  if (cachedAllModels) return cachedAllModels;

  const models: QuantitativeModel[] = [];
  const seen = new Set<string>();

  const addModel = (model: QuantitativeModel | null) => {
    if (model && !seen.has(model.modelId)) {
      seen.add(model.modelId);
      models.push(model);
    }
  };

  for (const bundled of Object.values(BUNDLED_MODELS)) {
    addModel(bundled);
  }

  if (typeof window === "undefined") {
    try {
      const pathMod = require("path") as typeof import("path");
      const { existsSync, readdirSync, readFileSync } =
        require("fs") as typeof import("fs");
      const dir = pathMod.join(process.cwd(), MODELS_DIR);

      if (existsSync(dir)) {
        const entries = readdirSync(dir);
        for (const filename of entries) {
          if (!filename.startsWith("model-") || !filename.endsWith(".json")) {
            continue;
          }
          const filePath = pathMod.join(dir, filename);
          const raw = JSON.parse(readFileSync(filePath, "utf8"));
          addModel(parseModel(raw, filePath));
        }
      }
    } catch {
      // bundled models only
    }
  }

  cachedAllModels = models.sort((a, b) => a.modelId.localeCompare(b.modelId));
  return cachedAllModels;
}

export function resetAllModelsCache(): void {
  cachedAllModels = null;
}
