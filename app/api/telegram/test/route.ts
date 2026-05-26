export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ROUTE_PATH = "/api/telegram/test";
const TELEGRAM_API = "https://api.telegram.org";
const TIMEOUT_MS = 10_000;

import { buildPremiumOperationalTelegramMessage } from "@/lib/execution/telegramMessageBuilder";
import type { QueuedDispatch } from "@/lib/execution/execution.types";

function buildTestMessage(): string {
  const sample: QueuedDispatch = {
    id: "telegram-test",
    fixtureId: "test",
    matchId: "test-match",
    matchLabel: "Bahia x Coritiba",
    league: "Teste",
    homeTeam: "Bahia",
    awayTeam: "Coritiba",
    signalType: "TEST",
    market: "OVER_0_5",
    source: "OPS_LAYER",
    minute: 67,
    pressureScore: 78,
    momentumScore: 72,
    chaosLevel: 40,
    accelerationScore: 60,
    evPercent: 3.5,
    fairOdd: 1.4,
    marketOdd: 1.52,
    confidence: 81,
    gameState: null,
    temperature: "HOT",
    riskContext: null,
    narrative:
      "Canal operacional premium conectado. Leitura contextual de teste enviada com sucesso.",
    headline: "Teste de integração",
    scoreDisplay: "1 – 0",
    urgency: "MEDIUM",
    priorityScore: 60,
    routes: ["telegram"],
    queuedAt: new Date().toISOString(),
  };
  return buildPremiumOperationalTelegramMessage(sample);
}

type TelegramApiResult = {
  ok?: boolean;
  description?: string;
  result?: Record<string, unknown>;
};

function log(scope: string, message: string, meta?: Record<string, unknown>) {
  const payload = meta ? ` ${JSON.stringify(meta)}` : "";
  console.log(`[GoalPressure] [${scope}] ${message}${payload}`);
}

function validateEnv():
  | { valid: true; botToken: string; chatId: string }
  | { valid: false; error: string } {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken) {
    return { valid: false, error: "TELEGRAM_BOT_TOKEN is missing or empty" };
  }
  if (!chatId) {
    return { valid: false, error: "TELEGRAM_CHAT_ID is missing or empty" };
  }

  return { valid: true, botToken, chatId };
}

async function sendToTelegram(
  botToken: string,
  chatId: string,
  text: string
): Promise<{ ok: boolean; body: TelegramApiResult | null; error?: string }> {
  const url = `${TELEGRAM_API}/bot${botToken}/sendMessage`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: controller.signal,
      cache: "no-store",
    });

    const body = (await res.json()) as TelegramApiResult;

    if (!res.ok || !body.ok) {
      return {
        ok: false,
        body,
        error: body.description ?? `HTTP ${res.status}`,
      };
    }

    return { ok: true, body };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, body: null, error: `Timeout after ${TIMEOUT_MS}ms` };
    }
    return {
      ok: false,
      body: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /api/telegram/test — real Telegram sendMessage test.
 */
export async function GET(): Promise<Response> {
  const timestamp = new Date().toISOString();

  log("api/telegram/test", "Request received", { path: ROUTE_PATH });

  const env = validateEnv();
  if (!env.valid) {
    log("api/telegram/test", "Validation failed", { error: env.error });
    return Response.json(
      {
        success: false,
        telegramResponse: null,
        timestamp,
        error: env.error,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const send = await sendToTelegram(env.botToken, env.chatId, buildTestMessage());

  if (!send.ok) {
    log("api/telegram/test", "Telegram send failed", { error: send.error });
    return Response.json(
      {
        success: false,
        telegramResponse: send.body,
        timestamp,
        error: send.error,
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }

  log("api/telegram/test", "Telegram send success", {
    messageId: send.body?.result,
  });

  return Response.json(
    {
      success: true,
      telegramResponse: send.body ?? { ok: true },
      timestamp,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } }
  );
}
