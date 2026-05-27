/**
 * Env boolean parsing with production-safe defaults.
 */

function parseTruthy(value: string): boolean {
  const n = value.trim().toLowerCase();
  return n === "true" || n === "1" || n === "yes";
}

/**
 * @param defaultWhenUnset - used in development when var is empty
 * @param defaultWhenUnsetProduction - used in production when var is empty (falls back to defaultWhenUnset)
 */
export function envBool(
  envName: string,
  defaultWhenUnset: boolean,
  defaultWhenUnsetProduction?: boolean
): boolean {
  const raw = process.env[envName];
  if (raw == null || raw.trim() === "") {
    if (process.env.NODE_ENV === "production") {
      return defaultWhenUnsetProduction ?? defaultWhenUnset;
    }
    return defaultWhenUnset;
  }
  return parseTruthy(raw);
}

export function isProductionEnv(): boolean {
  return process.env.NODE_ENV === "production";
}
