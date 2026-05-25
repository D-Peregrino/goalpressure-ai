/**
 * Aplica schemas SQL localmente (requer DATABASE_URL no .env.local).
 */

import { config } from "dotenv";
import { readFileSync, existsSync } from "fs";
import { join, resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const dbUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  process.env.DIRECT_URL?.trim();

const FILES = [
  "operational-seed-schema.sql",
  "live-runtime-schema.sql",
  "commercial-schema.sql",
];

async function main() {
  if (!dbUrl) {
    console.error("❌ DATABASE_URL ausente. Rode npm run setup:env após deploy ou copie do Railway.");
    process.exit(1);
  }

  const pg = await import("pg");
  const client = new pg.default.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const file of FILES) {
    const path = join(process.cwd(), "supabase", file);
    if (!existsSync(path)) continue;
    const sql = readFileSync(path, "utf8");
    console.log(`📄 ${file}…`);
    await client.query(sql);
    console.log(`   ✓`);
  }

  await client.end();
  console.log("✅ Schemas aplicados localmente");
}

main().catch((e) => {
  console.error("❌", e.message);
  process.exit(1);
});
