import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "OPS_ENGINE";

export function logOpsMetric(payload: {
  fixture: string;
  state: string;
  temperature: string;
  chaos: number;
  risk: string;
  pattern: string;
}): void {
  logInfo(
    LOG_SCOPE,
    `[OPS_ENGINE] fixture=${payload.fixture} state=${payload.state} temperature=${payload.temperature} chaos=${payload.chaos} risk=${payload.risk} pattern=${payload.pattern}`
  );
}
