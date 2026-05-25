/**
 * Aplica schemas SQL via API de produção (usa DATABASE_URL no Railway).
 */

import { config } from "dotenv";
import { createHash } from "crypto";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const SETUP_SALT = "goalpressure-setup-v1";
const base = process.env.GP_PRODUCTION_URL?.trim() || "https://goalpressure-ai-production.up.railway.app";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

function projectBootstrapKey(projectUrl) {
  return createHash("sha256").update(projectUrl + SETUP_SALT).digest("hex").slice(0, 32);
}

async function main() {
  if (!url) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL ausente. Rode: npm run setup:env");
    process.exit(1);
  }

  console.log(`📦 Aplicando schemas via ${base}/api/dev/apply-schema`);
  const res = await fetch(`${base}/api/dev/apply-schema`, {
    method: "POST",
    headers: { "x-gp-project-bootstrap": projectBootstrapKey(url) },
  });

  const json = await res.json().catch(() => ({}));
  console.log(JSON.stringify(json, null, 2));

  if (!res.ok || !json.ok) {
    process.exit(1);
  }
  console.log("✅ Schemas aplicados:", json.applied?.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
