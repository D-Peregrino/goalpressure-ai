import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "ENGINE";

export function logEngineMetric(payload: {
  fixture: string;
  score: number;
  momentum: number;
  acceleration: number;
  territorial: number;
  classification: string;
  signal: string | null;
}): void {
  logInfo(
    LOG_SCOPE,
    `[ENGINE] fixture=${payload.fixture} score=${payload.score} momentum=${payload.momentum} acceleration=${payload.acceleration} territorial=${payload.territorial} class=${payload.classification} signal=${payload.signal ?? "none"}`
  );
}
