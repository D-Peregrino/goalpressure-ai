import { COPA_CACHE_TTL_MS } from "@/lib/copa/config";
import type { CopaDataset } from "@/lib/copa/types";
import { buildCopaDataset } from "@/lib/copa/buildCopaDataset";

let cached: { at: number; data: CopaDataset } | null = null;
let inflight: Promise<CopaDataset> | null = null;

export async function getCopaDatasetCached(): Promise<CopaDataset> {
  const now = Date.now();
  if (cached && now - cached.at < COPA_CACHE_TTL_MS) {
    return cached.data;
  }

  if (!inflight) {
    inflight = buildCopaDataset()
      .then((data) => {
        cached = { at: Date.now(), data };
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
