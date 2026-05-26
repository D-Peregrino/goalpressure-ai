export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import type { QueuedDispatch } from "@/lib/execution/execution.types";
import { buildPremiumOperationalTelegramMessage } from "@/lib/execution/telegramMessageBuilder";
import {
  getTelegramMessageHistory,
  getTelegramSandboxPreview,
} from "@/lib/execution/telegramMessageLog";
import { isTelegramSandboxMode } from "@/lib/telegram/telegramClient";

function sampleDispatch(): QueuedDispatch {
  const now = new Date().toISOString();
  return {
    id: "sandbox-sample",
    fixtureId: "sandbox-fixture",
    matchId: "sandbox-match",
    matchLabel: "Bahia x Coritiba",
    league: "Brasileirão",
    homeTeam: "Bahia",
    awayTeam: "Coritiba",
    signalType: "PRESSURE_CONTEXT",
    market: "OVER_0_5",
    source: "PRESSURE_ENGINE",
    minute: 67,
    pressureScore: 78,
    momentumScore: 72,
    chaosLevel: 48,
    accelerationScore: 64,
    evPercent: 4.2,
    fairOdd: 1.42,
    marketOdd: 1.55,
    confidence: 81,
    gameState: "LATE_PRESSURE",
    temperature: "HOT",
    riskContext: "MODERATE",
    narrative:
      "Sequência ofensiva consistente detectada nos últimos minutos. Mercado ainda reage lentamente à aceleração ofensiva.",
    headline: "Leitura contextual detectada",
    scoreDisplay: "1 – 0",
    urgency: "HIGH",
    priorityScore: 74,
    routes: ["telegram"],
    queuedAt: now,
  };
}

/**
 * GET /api/telegram/sandbox — pré-visualização premium + histórico recente.
 */
export async function GET(): Promise<Response> {
  const sample = buildPremiumOperationalTelegramMessage(sampleDispatch());
  const history = getTelegramMessageHistory(30);
  const last = getTelegramSandboxPreview();

  return Response.json(
    {
      ok: true,
      sandboxMode: isTelegramSandboxMode(),
      sampleMessage: sample,
      lastMessage: last,
      history,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
