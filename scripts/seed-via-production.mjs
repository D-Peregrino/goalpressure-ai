/**
 * Executa seed no Supabase via API de produção (bootstrap SportMonks).
 * Use quando setup:env ainda não tiver SERVICE_ROLE local.
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const base = process.env.GP_PRODUCTION_URL?.trim() || "https://goalpressure-ai-production.up.railway.app";
const token = process.env.SPORTMONKS_API_TOKEN?.trim();

async function main() {
  const clear = process.argv.includes("--clear");
  if (!token) {
    console.error("❌ SPORTMONKS_API_TOKEN ausente em .env.local");
    process.exit(1);
  }

  console.log(`🌐 Seed remoto → ${base}/api/dev/seed`);
  const res = await fetch(`${base}/api/dev/seed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-gp-sportmonks-bootstrap": token,
    },
    body: JSON.stringify({ clear }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.ok) {
    console.error("❌ Falha:", json.error || res.status);
    if (json.hint) console.log("💡", json.hint);
    process.exit(1);
  }

  console.log("✅ Seed remoto concluído:");
  for (const [k, v] of Object.entries(json.counts ?? {})) {
    console.log(`   ${k}: ${v}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
