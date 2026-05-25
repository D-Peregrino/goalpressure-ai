import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "AUTONOMOUS_CORE";

export function logAutonomousMetric(payload: {
  fixture: string;
  regime: string;
  sensitivity: string;
  aggression: string;
  falsePositive: number;
  dispatch: string;
}): void {
  logInfo(
    LOG_SCOPE,
    `[AUTONOMOUS_CORE] fixture=${payload.fixture} regime=${payload.regime} sensitivity=${payload.sensitivity} aggression=${payload.aggression} false_positive=${payload.falsePositive} dispatch=${payload.dispatch}`
  );
}
