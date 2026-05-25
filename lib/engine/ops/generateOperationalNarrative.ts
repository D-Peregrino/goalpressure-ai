import type { OpsEngineInput, OperationalInsightResult } from "@/lib/engine/ops/ops.types";
import { gameStateLabel } from "@/lib/engine/ops/detectGameState";
import { pressurePatternLabel } from "@/lib/engine/ops/detectPressurePattern";
import { riskContextLabel } from "@/lib/engine/ops/calculateRiskContext";
import type { GameState, PressurePattern, RiskContext, MatchTemperature } from "@/lib/engine/ops/ops.types";

export function generateOperationalHeadline(
  input: OpsEngineInput,
  temperature: MatchTemperature,
  gameState: GameState
): string {
  const ev = input.ev?.expectedValue.best;
  const p = input.pressure?.pressureScore ?? input.match.pressure.score;

  if (temperature === "IGNITE" && ev && ev.evPercent >= 5) {
    return "Convergência operacional — pressão, valor e contexto alinhados";
  }
  if (gameState === "LATE_PRESSURE") {
    return "Pressão tardia com aceleração ofensiva crescente";
  }
  if (p >= 72) {
    return "Intensidade ofensiva elevada — leitura institucional ativa";
  }
  if (temperature === "COLD") {
    return "Contexto frio — monitoramento passivo";
  }
  return "Leitura operacional em atualização";
}

export function generateOperationalNarrative(
  input: OpsEngineInput,
  ctx: {
    gameState: GameState;
    pattern: PressurePattern;
    tacticalScenario: string;
    temperature: MatchTemperature;
    risk: RiskContext;
    chaosLevel: number;
  }
): string {
  const p = input.pressure?.pressureScore ?? input.match.pressure.score;
  const a = input.pressure?.accelerationScore ?? 0;
  const terr = input.pressure?.territorialScore ?? 0;
  const ev = input.ev?.expectedValue.best;
  const dist = input.ev?.distortion.level;
  const minute = input.match.minute;

  const parts: string[] = [];

  if (ctx.pattern !== "NEUTRAL") {
    parts.push(`${pressurePatternLabel(ctx.pattern)} nos últimos ciclos.`);
  }

  if (a >= 55) {
    parts.push(
      `Aceleração ofensiva em ${Math.round(a)} e domínio territorial em ${Math.round(terr)} indicam cenário ${ctx.temperature === "IGNITE" || ctx.temperature === "HOT" ? "favorável a movimento de mercado" : "em desenvolvimento"}.`
    );
  } else if (p >= 50) {
    parts.push(
      `Pressão consolidada em ${Math.round(p)} com estado ${gameStateLabel(ctx.gameState).toLowerCase()}.`
    );
  }

  parts.push(ctx.tacticalScenario.endsWith(".") ? ctx.tacticalScenario : `${ctx.tacticalScenario}.`);

  if (ev && ev.evPercent >= 3) {
    parts.push(
      `Modelo registra EV de +${ev.evPercent.toFixed(1)}% em ${ev.market} com confiança ${input.ev?.confidence.score ?? "—"}.`
    );
  }

  if (dist === "HIGH" || dist === "EXTREME") {
    parts.push("Mercado apresenta distorção frente à intensidade medida em campo.");
  } else if (p >= 60 && dist === "LOW") {
    parts.push("Mercado ainda reage lentamente à intensidade atual.");
  }

  if (ctx.risk !== "LOW") {
    parts.push(`${riskContextLabel(ctx.risk)} — validar liquidez e contexto antes de execução.`);
  }

  if (minute >= 70) {
    parts.push(`Minuto ${minute}: janela operacional no segmento final.`);
  }

  if (ctx.chaosLevel >= 65) {
    parts.push(`Volatilidade ofensiva em ${ctx.chaosLevel} — ritmo imprevisível.`);
  }

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function generateOperationalConductor(
  insight: Pick<OperationalInsightResult, "gameState" | "temperature" | "riskContext" | "focusScore">
): string {
  return `${gameStateLabel(insight.gameState)} · ${insight.temperature} · ${riskContextLabel(insight.riskContext)} · foco ${insight.focusScore}`;
}
