/**
 * Configura .env.local para seed operacional Supabase.
 * Fontes: .env.local existente, .env, produção (JWT + /api/dev/setup-env).
 * Não usa Railway CLI.
 */

import { config } from "dotenv";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const SETUP_SALT = "goalpressure-setup-v1";

function projectBootstrapKey(url) {
  return createHash("sha256").update(url + SETUP_SALT).digest("hex").slice(0, 32);
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const ENV_LOCAL = resolve(ROOT, ".env.local");

config({ path: ENV_LOCAL });
config({ path: resolve(ROOT, ".env") });

const DEFAULT_PRODUCTION = "https://goalpressure-ai-production.up.railway.app";
const ENV_FILES = [
  ENV_LOCAL,
  resolve(ROOT, ".env"),
  resolve(ROOT, ".env.supabase.secrets"),
];

function parseEnvFile(path) {
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 1) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

function mergeEnv(...maps) {
  return Object.assign({}, ...maps);
}

async function discoverUrlFromProduction(base) {
  try {
    const res = await fetch(`${base}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "EnvProbe",
        email: `env-probe-${Date.now()}@goalpressure.local`,
        password: "EnvProbe123456!",
      }),
    });
    const json = await res.json().catch(() => ({}));
    const token = json.accessToken;
    if (!token) return null;
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const iss = payload.iss;
    if (!iss) return null;
    return new URL(iss).origin;
  } catch {
    return null;
  }
}

async function fetchSetupEnvFromProduction(base, sportmonksToken, projectUrl) {
  try {
    const headers = { cache: "no-store" };
    if (sportmonksToken) headers["x-gp-sportmonks-bootstrap"] = sportmonksToken;
    if (projectUrl) headers["x-gp-project-bootstrap"] = projectBootstrapKey(projectUrl);
    const res = await fetch(`${base}/api/dev/setup-env`, { headers });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

function isValidServiceRole(key) {
  if (!key?.trim()) return false;
  const k = key.trim();
  return k.startsWith("sb_secret_") || k.startsWith("eyJ");
}

function prefersSbSecret(key) {
  return key?.trim().startsWith("sb_secret_");
}

function buildEnvContent(existing, vars) {
  const lines = [];
  const written = new Set();

  const push = (key, value, comment) => {
    if (value === undefined || value === null || value === "") return;
    if (comment) lines.push(`# ${comment}`);
    lines.push(`${key}=${value}`);
    written.add(key);
  };

  const sportmonks =
    vars.SPORTMONKS_API_TOKEN ||
    existing.SPORTMONKS_API_TOKEN ||
    process.env.SPORTMONKS_API_TOKEN;

  if (sportmonks) {
    lines.push("# Sportmonks Football API (server-side only — never commit this file)");
    push("SPORTMONKS_API_TOKEN", sportmonks);
    lines.push("");
  }

  lines.push("# Supabase — seed operacional (gerado por scripts/setup-local-env.mjs)");
  const url =
    vars.NEXT_PUBLIC_SUPABASE_URL ||
    vars.SUPABASE_URL ||
    existing.NEXT_PUBLIC_SUPABASE_URL ||
    existing.SUPABASE_URL;
  push("NEXT_PUBLIC_SUPABASE_URL", url);
  push("SUPABASE_URL", url);
  push(
    "SUPABASE_SERVICE_ROLE_KEY",
    vars.SUPABASE_SERVICE_ROLE_KEY ||
      existing.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  push("GP_ALLOW_SEED", vars.GP_ALLOW_SEED ?? "true");
  push("GP_SEED_LIVE", vars.GP_SEED_LIVE ?? "true");
  push(
    "ADMIN_EMAILS",
    vars.ADMIN_EMAILS || existing.ADMIN_EMAILS || "admin@goalpressure.seed"
  );
  push("SEED_ADMIN_EMAIL", vars.SEED_ADMIN_EMAIL || "admin@goalpressure.seed");
  push("DATABASE_URL", vars.DATABASE_URL || existing.DATABASE_URL);

  lines.push("");
  lines.push("# Optional overrides");
  lines.push("# SPORTMONKS_API_BASE_URL=https://api.sportmonks.com/v3/football");
  lines.push("# SPORTMONKS_FETCH_TIMEOUT_MS=15000");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  console.log("⚙️  GoalPressure — setup .env.local (Supabase seed)\n");

  const fromFiles = mergeEnv(...ENV_FILES.map(parseEnvFile));
  const productionBase =
    process.env.GP_PRODUCTION_URL?.trim() || DEFAULT_PRODUCTION;

  let url =
    fromFiles.NEXT_PUBLIC_SUPABASE_URL ||
    fromFiles.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  if (!url) {
    console.log("   Descobrindo URL Supabase via produção…");
    url = await discoverUrlFromProduction(productionBase);
    if (url) console.log(`   ✓ URL: ${url}`);
  }

  let serviceRole =
    fromFiles.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const sportmonks =
    fromFiles.SPORTMONKS_API_TOKEN || process.env.SPORTMONKS_API_TOKEN;

  let databaseUrl = fromFiles.DATABASE_URL || process.env.DATABASE_URL;

  if (!isValidServiceRole(serviceRole) && url) {
    console.log("   Buscando credenciais via API de setup (produção)…");
    const remote = await fetchSetupEnvFromProduction(productionBase, sportmonks, url);
    if (remote?.ok && isValidServiceRole(remote.serviceRoleKey)) {
      serviceRole = remote.serviceRoleKey;
      if (!url && remote.url) url = remote.url;
      if (remote.databaseUrl) databaseUrl = remote.databaseUrl;
      console.log("   ✓ setup-env (produção)");
    }
  }

  const merged = {
    ...fromFiles,
    NEXT_PUBLIC_SUPABASE_URL: url,
    SUPABASE_URL: url,
    SUPABASE_SERVICE_ROLE_KEY: serviceRole,
    DATABASE_URL: databaseUrl,
    GP_ALLOW_SEED: "true",
    GP_SEED_LIVE: "true",
  };

  writeFileSync(ENV_LOCAL, buildEnvContent(fromFiles, merged), "utf8");
  console.log(`\n📝 Atualizado: ${ENV_LOCAL}`);

  const okUrl = Boolean(url);
  const okKey = isValidServiceRole(serviceRole);

  console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${okUrl ? "✓" : "✗"}`);
  const keyLabel = prefersSbSecret(serviceRole)
    ? "✓ (sb_secret_*)"
    : okKey
      ? "✓ (eyJ legado — prefira sb_secret_ no Railway)"
      : "✗ ausente ou inválido";
  console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${keyLabel}`);
  console.log(`   GP_ALLOW_SEED: true`);
  console.log(`   GP_SEED_LIVE: true`);

  if (!okUrl || !okKey) {
    console.log("\n⚠️  Credenciais incompletas. Após deploy, rode: npm run setup:env");
    process.exit(1);
  }

  console.log("\n✅ Ambiente local pronto para npm run seed");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
