/**
 * Lightweight production health checks — no runtime bootstrap, no live engine imports.
 */

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import { getSupabasePublicUrl } from "@/lib/supabase/env";

const DATA_DIR = path.join(process.cwd(), "data");
const PROBE_FILE = path.join(DATA_DIR, ".health-probe");
const startedAt = Date.now();

export type HealthCheckStatus = "pass" | "warn" | "fail";

export interface HealthCheckResult {
  status: HealthCheckStatus;
  message: string;
}

export interface ProductionHealthPayload {
  ok: boolean;
  status: "healthy" | "degraded" | "unhealthy";
  checks: Record<string, HealthCheckResult>;
  errors: string[];
  timestamp: string;
  uptime: number;
  environment: string;
  /** Legacy fields for terminal badge (optional). */
  database?: { configured: boolean; connected: boolean; mode: string };
  telegram?: { configured: boolean; status: string };
  liveFeed?: { sportmonksTokenSet: boolean; status: string };
}

function envPresent(name: string): boolean {
  const value = process.env[name]?.trim();
  return Boolean(value && value !== "your_token_here");
}

function runCheck(
  checks: Record<string, HealthCheckResult>,
  errors: string[],
  id: string,
  fn: () => HealthCheckResult
): void {
  try {
    checks[id] = fn();
    if (checks[id].status === "fail") {
      errors.push(`${id}: ${checks[id].message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "check_failed";
    checks[id] = { status: "fail", message };
    errors.push(`${id}: ${message}`);
  }
}

async function checkSupabase(): Promise<HealthCheckResult> {
  const url = process.env.SUPABASE_URL?.trim() || getSupabasePublicUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    return {
      status: "warn",
      message: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — local_only",
    };
  }

  if (!isSupabaseConfigured()) {
    return { status: "warn", message: "Supabase not configured" };
  }

  const client = getSupabaseAdmin();
  if (!client) {
    return { status: "fail", message: "Supabase admin client unavailable" };
  }

  const { error } = await client.from("signals").select("id").limit(1);
  if (error) {
    return { status: "fail", message: error.message };
  }

  return { status: "pass", message: "connected" };
}

async function checkStorage(): Promise<HealthCheckResult> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(PROBE_FILE, new Date().toISOString(), "utf8");
    await unlink(PROBE_FILE);
    return { status: "pass", message: "writable" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "not_writable";
    return { status: "fail", message };
  }
}

function aggregateStatus(
  checks: Record<string, HealthCheckResult>,
  errors: string[]
): ProductionHealthPayload["status"] {
  const critical = ["storage", "supabase_query"];
  const hasCriticalFail = critical.some(
    (id) => checks[id]?.status === "fail"
  );
  if (hasCriticalFail && errors.length > 0) return "unhealthy";

  const warnOrFail = Object.values(checks).some(
    (c) => c.status === "warn" || c.status === "fail"
  );
  if (warnOrFail) return "degraded";
  return "healthy";
}

export async function runProductionHealthCheck(): Promise<ProductionHealthPayload> {
  const checks: Record<string, HealthCheckResult> = {};
  const errors: string[] = [];

  runCheck(checks, errors, "node", () => ({
    status: "pass",
    message: process.version,
  }));

  runCheck(checks, errors, "database_url", () => ({
    status: envPresent("DATABASE_URL") ||
      envPresent("DIRECT_URL") ||
      envPresent("POSTGRES_URL") ||
      envPresent("SUPABASE_DB_URL")
      ? "pass"
      : "warn",
    message: envPresent("DATABASE_URL")
      ? "DATABASE_URL set"
      : "DATABASE_URL not set (schema apply uses fallback URLs)",
  }));

  runCheck(checks, errors, "sportmonks_token", () => ({
    status: envPresent("SPORTMONKS_API_TOKEN") ? "pass" : "warn",
    message: envPresent("SPORTMONKS_API_TOKEN")
      ? "SPORTMONKS_API_TOKEN set"
      : "SPORTMONKS_API_TOKEN missing",
  }));

  runCheck(checks, errors, "supabase_url", () => ({
    status:
      envPresent("SUPABASE_URL") || Boolean(getSupabasePublicUrl())
        ? "pass"
        : "warn",
    message:
      envPresent("SUPABASE_URL") || getSupabasePublicUrl()
        ? "SUPABASE_URL set"
        : "SUPABASE_URL missing",
  }));

  runCheck(checks, errors, "supabase_service_role", () => ({
    status: envPresent("SUPABASE_SERVICE_ROLE_KEY") ? "pass" : "warn",
    message: envPresent("SUPABASE_SERVICE_ROLE_KEY")
      ? "SUPABASE_SERVICE_ROLE_KEY set"
      : "SUPABASE_SERVICE_ROLE_KEY missing",
  }));

  runCheck(checks, errors, "telegram_bot_token", () => ({
    status: envPresent("TELEGRAM_BOT_TOKEN") ? "pass" : "warn",
    message: envPresent("TELEGRAM_BOT_TOKEN")
      ? "TELEGRAM_BOT_TOKEN set"
      : "TELEGRAM_BOT_TOKEN missing",
  }));

  runCheck(checks, errors, "telegram_chat_id", () => ({
    status: envPresent("TELEGRAM_CHAT_ID") ? "pass" : "warn",
    message: envPresent("TELEGRAM_CHAT_ID")
      ? "TELEGRAM_CHAT_ID set"
      : "TELEGRAM_CHAT_ID missing",
  }));

  try {
    checks.storage = await checkStorage();
    if (checks.storage.status === "fail") {
      errors.push(`storage: ${checks.storage.message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "storage_check_failed";
    checks.storage = { status: "fail", message };
    errors.push(`storage: ${message}`);
  }

  try {
    checks.supabase_query = await checkSupabase();
    if (checks.supabase_query.status === "fail") {
      errors.push(`supabase_query: ${checks.supabase_query.message}`);
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "supabase_query_failed";
    checks.supabase_query = { status: "fail", message };
    errors.push(`supabase_query: ${message}`);
  }

  const status = aggregateStatus(checks, errors);
  const ok = status === "healthy" || status === "degraded";

  const sportmonksSet = envPresent("SPORTMONKS_API_TOKEN");
  const supabaseConfigured = isSupabaseConfigured();
  const supabaseConnected = checks.supabase_query?.status === "pass";
  const telegramConfigured =
    envPresent("TELEGRAM_BOT_TOKEN") && envPresent("TELEGRAM_CHAT_ID");

  return {
    ok,
    status,
    checks,
    errors,
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    environment: process.env.NODE_ENV ?? "development",
    database: {
      configured: supabaseConfigured,
      connected: supabaseConnected,
      mode: supabaseConnected ? "supabase" : "local_only",
    },
    telegram: {
      configured: telegramConfigured,
      status: telegramConfigured ? "READY" : "OFFLINE",
    },
    liveFeed: {
      sportmonksTokenSet: sportmonksSet,
      status: sportmonksSet ? "CONFIGURED" : "MISSING_TOKEN",
    },
  };
}
