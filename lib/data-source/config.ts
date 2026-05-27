/**
 * Regras de fonte de dados — SportMonks real vs seed (somente dev sem token).
 */

export type ActiveDataSource = "sportmonks" | "seed" | "none";

const PLACEHOLDER_TOKENS = new Set(["", "COLE_SEU_TOKEN_AQUI", "your_token_here"]);

export function getSportmonksApiToken(): string | null {
  const token = process.env.SPORTMONKS_API_TOKEN?.trim();
  if (!token || PLACEHOLDER_TOKENS.has(token)) return null;
  return token;
}

export function isSportmonksTokenConfigured(): boolean {
  return getSportmonksApiToken() !== null;
}

export function getSportmonksBaseUrl(): string {
  return (
    process.env.SPORTMONKS_BASE_URL?.trim() ||
    process.env.SPORTMONKS_API_BASE_URL?.trim() ||
    "https://api.sportmonks.com/v3/football"
  ).replace(/\/$/, "");
}

export function isSeedLiveExplicitlyEnabled(): boolean {
  return process.env.GP_SEED_LIVE === "true";
}

export function isSeedAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return isSeedLiveExplicitlyEnabled() && !isSportmonksTokenConfigured();
}

/** Produção com token SportMonks: seed nunca é fonte ativa. */
export function resolveActiveDataSource(): ActiveDataSource {
  if (isSportmonksTokenConfigured()) return "sportmonks";
  if (isSeedAllowed()) return "seed";
  return "none";
}

export function isGpSeedExternalId(externalId: string | null | undefined): boolean {
  if (!externalId) return false;
  return externalId.startsWith("gp-seed");
}
