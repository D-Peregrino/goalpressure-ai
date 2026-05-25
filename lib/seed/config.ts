/** Prefixo para IDs de seed — facilita limpeza sem afetar dados reais. */
export const SEED_PREFIX = "gp-seed";

export const SEED_TAG = "goalpressure_operational_seed_v1";

export function isSeedEnabled(): boolean {
  return process.env.GP_ALLOW_SEED === "true" || process.env.NODE_ENV !== "production";
}

export function seedFixtureId(n: number): string {
  return `${SEED_PREFIX}-fx-${String(n).padStart(4, "0")}`;
}

export function seedSignalId(n: number): string {
  return `${SEED_PREFIX}-sig-${String(n).padStart(5, "0")}`;
}

export const SEED_USERS = {
  admin: process.env.SEED_ADMIN_EMAIL?.trim() || "admin@goalpressure.seed",
  founder: "founder@goalpressure.seed",
  free: "free@goalpressure.seed",
  premium: "premium@goalpressure.seed",
} as const;

export const SEED_DEFAULT_PASSWORD =
  process.env.SEED_DEFAULT_PASSWORD ?? "GoalPressure@Seed2026";
