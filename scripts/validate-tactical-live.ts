/**
 * Valida leitura tática contra jogos do cache local / live-matches.
 * Uso: npx tsx scripts/validate-tactical-live.ts [baseUrl]
 */

import { buildTacticalIntelligenceDebugReport } from "../lib/tactical/tacticalIntelligenceDebugServer";
import { buildOpsApiPayload } from "../lib/ops/opsSnapshot";
import type { Match } from "../types/domain";

const base = process.argv[2] ?? "http://localhost:3000";

async function main() {
  const lmRes = await fetch(`${base}/api/live-matches`, { cache: "no-store" });
  const lmBody = (await lmRes.json()) as { matches?: Match[] };
  const matches = lmBody.matches ?? [];

  const ops = await buildOpsApiPayload(0);
  const fixtures = buildTacticalIntelligenceDebugReport(matches, ops);

  console.log(`\n=== Tactical Intelligence (${fixtures.length} jogos) ===\n`);

  const headers = [
    "fixtureId",
    "jogo",
    "status",
    "tacticalProfile",
    "narrative",
    "intensity",
    "control",
    "emotion",
    "transRisk",
    "volatility",
    "confidence",
    "sources",
    "limited",
    "reasoning",
  ];
  console.log(headers.join("\t"));

  for (const f of fixtures) {
    const row = [
      f.fixtureId,
      f.matchLabel,
      f.status,
      f.tacticalProfile,
      f.narrative.slice(0, 60),
      String(f.tacticalIntensity),
      f.offensiveControl,
      String(f.emotionalTemperature),
      String(f.transitionRisk),
      f.volatilityProfile,
      String(f.confidence),
      f.sourcesUsed.join("+"),
      String(f.limitedReading),
      f.reasoning.slice(0, 50),
    ];
    console.log(row.join("\t"));
  }

  const narratives = fixtures.map((f) => f.narrative);
  const profiles = fixtures.map((f) => f.tacticalProfile);
  const confs = fixtures.map((f) => f.confidence);
  const uniqN = new Set(narratives).size;
  const uniqP = new Set(profiles).size;
  const uniqC = new Set(confs).size;

  console.log(`\nÚnicos: narrativas=${uniqN}/${fixtures.length} profiles=${uniqP} confidence=${uniqC}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
