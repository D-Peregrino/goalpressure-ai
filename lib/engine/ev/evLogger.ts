import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "EV_ENGINE";

export function logEvEngineMetric(payload: {
  fixture: string;
  probability: number;
  fairOdds: number;
  marketOdds: number;
  ev: number;
  confidence: number;
  distortion: string;
}): void {
  logInfo(
    LOG_SCOPE,
    `[EV_ENGINE] fixture=${payload.fixture} probability=${payload.probability} fair_odds=${payload.fairOdds} market_odds=${payload.marketOdds} ev=${payload.ev}% confidence=${payload.confidence} distortion=${payload.distortion}`
  );
}
