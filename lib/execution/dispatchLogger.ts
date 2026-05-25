import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "DISPATCH_ENGINE";

export function logDispatchMetric(payload: {
  fixture: string;
  signal: string;
  urgency: string;
  route: string;
  telegram?: boolean;
  push?: boolean;
}): void {
  logInfo(
    LOG_SCOPE,
    `[DISPATCH_ENGINE] fixture=${payload.fixture} signal=${payload.signal} urgency=${payload.urgency} route=${payload.route} telegram=${payload.telegram ?? false} push=${payload.push ?? false}`
  );
}
