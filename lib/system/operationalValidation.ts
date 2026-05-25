/**
 * Validação operacional ponta a ponta — dados reais, schemas, engines.
 */

import {
  isSportmonksTokenConfigured,
  resolveActiveDataSource,
} from "@/lib/data-source/config";
import { fetchLiveFixtures } from "@/lib/sportmonks/client";
import { runSportmonksDiagnostic } from "@/lib/sportmonks/client";
import { getSupabaseAdmin, getSupabaseProjectUrl, isSupabaseConfigured } from "@/lib/supabase/client";
import { isTelegramConfigured, isTelegramSandboxMode } from "@/lib/telegram/telegramClient";
import { getTelegramHealthDetail } from "@/lib/telegram/telegramHealth";
import { getLivePollingEngine } from "@/lib/live/livePollingEngine";
import { getDispatchSnapshot } from "@/lib/execution/dispatchSnapshotStore";
import { getAutonomousCoreSnapshot } from "@/lib/autonomous/autonomousSnapshotStore";
import { getLearningSnapshot } from "@/lib/engine/learning/learningSnapshotStore";
import { getLiveEngineSnapshot } from "@/lib/engine/engineSnapshotStore";
import { getDatabaseUrl } from "@/lib/system/applyAllSchemas";
import { OPERATIONAL_SCHEMA_FILES } from "@/lib/system/applyAllSchemas";
import type {
  OperationalValidationReport,
  RecentSample,
  TableProbe,
  ValidationCheck,
  ValidationStatus,
} from "@/lib/system/operationalValidation.types";

export type {
  OperationalValidationReport,
  RecentSample,
  TableProbe,
  ValidationCheck,
  ValidationStatus,
} from "@/lib/system/operationalValidation.types";

const ENGINE_TABLES = [
  "live_pressure_snapshots",
  "live_ev_signals",
  "operational_insights",
  "historical_signal_outcomes",
  "league_behavior_profiles",
  "team_behavior_profiles",
  "engine_weight_recommendations",
  "live_signal_dispatches",
  "autonomous_decisions",
] as const;

async function probeTable(
  table: string
): Promise<TableProbe> {
  const client = getSupabaseAdmin();
  if (!client) {
    return {
      name: table,
      exists: false,
      reachable: false,
      rowCountEstimate: null,
      lastRowAt: null,
      error: "supabase_not_configured",
    };
  }

  try {
    const { data, error, count } = await client
      .from(table)
      .select("created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      const missing =
        error.message.includes("does not exist") ||
        error.code === "42P01" ||
        error.message.includes("schema cache");
      return {
        name: table,
        exists: !missing,
        reachable: false,
        rowCountEstimate: null,
        lastRowAt: null,
        error: error.message,
      };
    }

    const last = data?.[0] as { created_at?: string } | undefined;
    return {
      name: table,
      exists: true,
      reachable: true,
      rowCountEstimate: count ?? null,
      lastRowAt: last?.created_at ?? null,
      error: null,
    };
  } catch (e) {
    return {
      name: table,
      exists: false,
      reachable: false,
      rowCountEstimate: null,
      lastRowAt: null,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function fetchRecentMatches(): Promise<RecentSample[]> {
  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from("matches")
    .select("external_id, home_team, away_team, source, last_seen_at, updated_at")
    .neq("source", "seed")
    .order("last_seen_at", { ascending: false })
    .limit(5);

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      fixtureId: String(r.external_id ?? ""),
      createdAt: String(r.last_seen_at ?? r.updated_at ?? ""),
      summary: `${r.home_team} x ${r.away_team} (${r.source})`,
    };
  });
}

async function fetchRecent(
  table: string,
  select: string
): Promise<RecentSample[]> {
  const client = getSupabaseAdmin();
  if (!client) return [];

  const { data, error } = await client
    .from(table)
    .select(select)
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !data) return [];

  return data.map((row) => {
    const r = row as unknown as Record<string, unknown>;
    return {
      fixtureId: String(r.fixture_id ?? r.fixtureId ?? ""),
      createdAt: String(r.created_at ?? ""),
      summary: JSON.stringify(r).slice(0, 120),
    };
  });
}

function engineStatus(
  table: TableProbe,
  memoryOk: boolean
): ValidationStatus {
  if (table.reachable && (table.rowCountEstimate ?? 0) > 0) return "ok";
  if (table.reachable || memoryOk) return "warn";
  return "fail";
}

export async function runOperationalValidation(): Promise<OperationalValidationReport> {
  const pendingErrors: string[] = [];
  const generatedAt = new Date().toISOString();
  const activeDataSource = resolveActiveDataSource();
  const seedDisabled = activeDataSource !== "seed";

  let sportmonksConfigured = isSportmonksTokenConfigured();
  let sportmonksConnected = false;
  let inPlayCount = 0;
  let sportmonksError: string | null = null;
  let diagnosticOk = false;

  if (sportmonksConfigured) {
    try {
      const diag = await runSportmonksDiagnostic();
      diagnosticOk =
        diag.tokenConfigured &&
        !diag.error &&
        (diag.httpStatus == null || diag.httpStatus < 500);
      if (!diagnosticOk) {
        sportmonksError = diag.error ?? `HTTP ${diag.httpStatus ?? "—"}`;
        pendingErrors.push(`SportMonks: ${sportmonksError}`);
      }
    } catch (e) {
      sportmonksError = e instanceof Error ? e.message : String(e);
      pendingErrors.push(`SportMonks diagnostic: ${sportmonksError}`);
    }

    try {
      const inplay = await fetchLiveFixtures();
      inPlayCount = inplay.fixtures.length;
      sportmonksConnected = true;
    } catch (e) {
      sportmonksConnected = false;
      const msg = e instanceof Error ? e.message : String(e);
      sportmonksError = sportmonksError ?? msg;
      pendingErrors.push(`SportMonks in-play: ${msg}`);
    }
  } else {
    pendingErrors.push("SPORTMONKS_API_TOKEN não configurado.");
  }

  let supabaseConnected = false;
  let supabaseError: string | null = null;
  const supabaseConfigured = isSupabaseConfigured();

  if (supabaseConfigured) {
    const client = getSupabaseAdmin();
    if (client) {
      const { error } = await client.from("matches").select("id").limit(1);
      if (error) {
        supabaseError = error.message;
        pendingErrors.push(`Supabase: ${error.message}`);
      } else {
        supabaseConnected = true;
      }
    } else {
      supabaseError = "admin_client_unavailable";
      pendingErrors.push("Supabase admin client indisponível.");
    }
  } else {
    pendingErrors.push("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes.");
  }

  const telegramDetail = await getTelegramHealthDetail();
  const tables = await Promise.all(ENGINE_TABLES.map((t) => probeTable(t)));

  for (const t of tables) {
    if (!t.exists || !t.reachable) {
      pendingErrors.push(`Tabela ${t.name}: ${t.error ?? "indisponível"}`);
    }
  }

  const engineSnap = getLiveEngineSnapshot();
  const dispatchSnap = getDispatchSnapshot();
  const learningSnap = getLearningSnapshot();
  const autonomousSnap = getAutonomousCoreSnapshot();
  const polling = getLivePollingEngine();
  const pollState = polling?.getState();

  const recent = {
    matches: await fetchRecentMatches(),
    pressureSnapshots: await fetchRecent(
      "live_pressure_snapshots",
      "fixture_id, pressure_score, created_at"
    ),
    evSignals: await fetchRecent(
      "live_ev_signals",
      "fixture_id, signal_type, expected_value, created_at"
    ),
    operationalInsights: await fetchRecent(
      "operational_insights",
      "fixture_id, game_state, temperature, created_at"
    ),
    dispatches: await fetchRecent(
      "live_signal_dispatches",
      "fixture_id, urgency, signal_type, created_at"
    ),
    autonomousDecisions: await fetchRecent(
      "autonomous_decisions",
      "fixture_id, regime, dispatch_decision, created_at"
    ),
    historicalOutcomes: await fetchRecent(
      "historical_signal_outcomes",
      "fixture_id, outcome, created_at"
    ),
  };

  const pressureTable = tables.find((t) => t.name === "live_pressure_snapshots")!;
  const evTable = tables.find((t) => t.name === "live_ev_signals")!;
  const opsTable = tables.find((t) => t.name === "operational_insights")!;

  const engines = {
    pressure: engineStatus(pressureTable, Boolean(engineSnap?.strongestPressure)),
    ev: engineStatus(evTable, Boolean(engineSnap?.signals?.length)),
    ops: engineStatus(opsTable, Boolean(engineSnap?.dispatch)),
    learning: learningSnap ? "ok" : ("warn" as ValidationStatus),
    execution: dispatchSnap ? "ok" : ("warn" as ValidationStatus),
    autonomous: autonomousSnap ? "ok" : ("warn" as ValidationStatus),
  };

  const productionDomain =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    null;
  const isProduction = process.env.NODE_ENV === "production";

  const checks: ValidationCheck[] = [
    {
      id: "data_source",
      label: "Fonte de dados real",
      status:
        activeDataSource === "sportmonks" && seedDisabled ? "ok" : "fail",
      detail:
        activeDataSource === "sportmonks"
          ? `SportMonks ativo · ${inPlayCount} jogos in-play`
          : `Fonte ativa: ${activeDataSource}`,
    },
    {
      id: "runtime",
      label: "Runtime ativo",
      status: pollState?.running ? "ok" : "warn",
      detail: pollState?.running
        ? `Polling desde ${pollState.startedAt ?? "—"}`
        : "Runtime parado — use Iniciar runtime",
    },
    {
      id: "schemas",
      label: "Supabase schemas",
      status: tables.every((t) => t.exists && t.reachable) ? "ok" : "fail",
      detail: `${tables.filter((t) => t.reachable).length}/${tables.length} tabelas engine OK`,
    },
    {
      id: "pressure_engine",
      label: "Pressure Engine",
      status: engines.pressure,
      detail:
        pressureTable.rowCountEstimate != null
          ? `${pressureTable.rowCountEstimate} snapshots`
          : "Sem snapshots persistidos",
    },
    {
      id: "ev_engine",
      label: "EV Engine",
      status: engines.ev,
      detail:
        evTable.rowCountEstimate != null
          ? `${evTable.rowCountEstimate} sinais EV`
          : "Sem sinais EV persistidos",
    },
    {
      id: "ops_engine",
      label: "OPS Engine",
      status: engines.ops,
      detail:
        opsTable.rowCountEstimate != null
          ? `${opsTable.rowCountEstimate} insights`
          : "Aguardando ciclo com jogos live",
    },
    {
      id: "learning_engine",
      label: "Learning Engine",
      status: engines.learning,
      detail: learningSnap
        ? `Hit rate ${learningSnap.accuracy.hitRate}% · ${learningSnap.accuracy.totalResolved} resolvidos`
        : "Snapshot vazio — aguardar outcomes históricos",
    },
    {
      id: "execution_layer",
      label: "Execution Layer",
      status: engines.execution,
      detail: dispatchSnap
        ? `${dispatchSnap.activeSignals} dispatches · fila ${dispatchSnap.queueSize}`
        : "Aguardando primeiro dispatch",
    },
    {
      id: "autonomous_core",
      label: "Autonomous Core",
      status: engines.autonomous,
      detail: autonomousSnap
        ? `Regime ${autonomousSnap.dominantRegime} · sens. ${autonomousSnap.sensitivity}`
        : "Aguardando perfis autônomos",
    },
    {
      id: "telegram",
      label: "Telegram",
      status: isTelegramConfigured()
        ? isTelegramSandboxMode()
          ? "warn"
          : telegramDetail.connected
            ? "ok"
            : "warn"
        : "fail",
      detail: isTelegramConfigured()
        ? isTelegramSandboxMode()
          ? "Configurado em sandbox (sem envio real)"
          : `Status ${telegramDetail.status}`
        : "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID ausentes",
    },
    {
      id: "production",
      label: "Domínio produção",
      status: isProduction && productionDomain ? "ok" : "warn",
      detail: productionDomain ?? "Domínio não definido (NEXT_PUBLIC_APP_URL)",
    },
  ];

  const ok =
    activeDataSource === "sportmonks" &&
    seedDisabled &&
    supabaseConnected &&
    sportmonksConfigured &&
    tables.every((t) => t.exists && t.reachable);

  return {
    ok,
    generatedAt,
    activeDataSource,
    seedDisabled,
    sportmonks: {
      configured: sportmonksConfigured,
      connected: sportmonksConnected,
      inPlayCount,
      diagnosticOk,
      error: sportmonksError,
    },
    supabase: {
      configured: supabaseConfigured,
      connected: supabaseConnected,
      projectUrl: getSupabaseProjectUrl() || null,
      databaseUrlConfigured: Boolean(getDatabaseUrl()),
      error: supabaseError,
    },
    telegram: {
      configured: isTelegramConfigured(),
      sandbox: isTelegramSandboxMode(),
      ready: isTelegramConfigured() && !isTelegramSandboxMode(),
      status: telegramDetail.status,
    },
    tables,
    schemasExpected: [...OPERATIONAL_SCHEMA_FILES],
    recent,
    engines,
    runtime: {
      active: Boolean(pollState?.running),
      lastPollAt: pollState?.lastPollAt ?? null,
      lastError: pollState?.lastError ?? null,
    },
    production: {
      domain: productionDomain,
      isProduction,
    },
    pendingErrors,
    checks,
  };
}
