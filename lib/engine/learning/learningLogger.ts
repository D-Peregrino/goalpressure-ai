import { logInfo } from "@/lib/utils/logger";

const LOG_SCOPE = "LEARNING_ENGINE";

export function logLearningMetric(payload: {
  fixture?: string;
  signal?: string;
  accuracy?: number;
  roi?: number;
  pattern?: string;
  recommendation?: string;
}): void {
  const parts = [
    payload.fixture != null ? `fixture=${payload.fixture}` : null,
    payload.signal != null ? `signal=${payload.signal}` : null,
    payload.accuracy != null ? `accuracy=${payload.accuracy}` : null,
    payload.roi != null ? `roi=${payload.roi}` : null,
    payload.pattern != null ? `pattern=${payload.pattern}` : null,
    payload.recommendation != null ? `recommendation=${payload.recommendation}` : null,
  ].filter(Boolean);

  logInfo(LOG_SCOPE, `[LEARNING_ENGINE] ${parts.join(" ")}`);
}
