/**
 * GoalPressure AI — seed operacional Supabase
 *
 * Uso:
 *   GP_ALLOW_SEED=true npm run seed
 *   npm run seed:clear
 *
 * Requer: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * Opcional: GP_SEED_LIVE=true no .env para terminal usar jogos do seed
 */

import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

async function main() {
  const clear = process.argv.includes("--clear");

  if (process.env.GP_ALLOW_SEED !== "true" && process.env.NODE_ENV === "production") {
    console.error("❌ Em produção defina GP_ALLOW_SEED=true para executar o seed.");
    process.exit(1);
  }

  const { runOperationalSeed } = await import("../lib/seed/runSeed");

  console.log("🌱 GoalPressure — seed operacional Supabase");
  if (clear) console.log("   Modo: limpar + repopular");

  const result = await runOperationalSeed({ clear });

  if (!result.ok) {
    console.error("❌ Falha:", result.error);
    console.log("\n💡 Execute no Supabase SQL Editor:");
    console.log("   supabase/operational-seed-schema.sql");
    process.exit(1);
  }

  console.log("✅ Seed concluído:");
  for (const [k, v] of Object.entries(result.counts)) {
    console.log(`   ${k}: ${v}`);
  }

  console.log("\n📋 Usuários de teste (senha = SEED_DEFAULT_PASSWORD ou GoalPressure@Seed2026):");
  console.log("   admin@goalpressure.seed | founder@goalpressure.seed");
  console.log("   free@goalpressure.seed  | premium@goalpressure.seed");
  console.log("\n🔧 Para terminal ao vivo com seed: GP_SEED_LIVE=true");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
