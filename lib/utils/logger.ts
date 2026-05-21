const PREFIX = "[GoalPressure]";

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const VERBOSE_LOGS =
  process.env.GP_LOG_VERBOSE === "true" ||
  process.env.GP_LOG_VERBOSE === "1";

function shouldLogInfo(): boolean {
  return !IS_PRODUCTION || VERBOSE_LOGS;
}

export function isProductionLogging(): boolean {
  return IS_PRODUCTION && !VERBOSE_LOGS;
}

export function logInfo(
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (!shouldLogInfo()) return;

  if (meta && Object.keys(meta).length > 0) {
    console.info(`${PREFIX} [${scope}] ${message}`, meta);
  } else {
    console.info(`${PREFIX} [${scope}] ${message}`);
  }
}

export function logWarn(
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (meta && Object.keys(meta).length > 0) {
    console.warn(`${PREFIX} [${scope}] ${message}`, meta);
  } else {
    console.warn(`${PREFIX} [${scope}] ${message}`);
  }
}

export function logError(
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (meta && Object.keys(meta).length > 0) {
    console.error(`${PREFIX} [${scope}] ${message}`, meta);
  } else {
    console.error(`${PREFIX} [${scope}] ${message}`);
  }
}

/** Production-safe operational log — always emitted. */
export function logOps(
  scope: string,
  message: string,
  meta?: Record<string, unknown>
): void {
  if (meta && Object.keys(meta).length > 0) {
    console.log(`${PREFIX} [${scope}] ${message}`, meta);
  } else {
    console.log(`${PREFIX} [${scope}] ${message}`);
  }
}
