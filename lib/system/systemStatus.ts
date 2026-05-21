/**
 * Production system health probes — Supabase, Sportmonks, Telegram, local JSON storage.
 */

import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/client";
import {
  getTelegramConfig,
  isTelegramConfigured,
} from "@/lib/telegram/telegramClient";

const DATA_DIR = path.join(process.cwd(), "data");
const PROBE_FILE = path.join(DATA_DIR, ".health-probe");

export type HealthStatus = "healthy" | "degraded" | "unhealthy";

export interface DatabaseHealth {
  configured: boolean;
  connected: boolean;
  mode: "supabase" | "local_only";
  error?: string;
}

export interface TelegramHealth {
  sandbox: boolean;
  configured: boolean;
  status: "SANDBOX" | "READY" | "OFFLINE";
}

export interface LiveFeedHealth {
  sportmonksTokenSet: boolean;
  status: "CONFIGURED" | "MISSING_TOKEN";
}

export interface StorageHealth {
  jsonFallback: boolean;
  writable: boolean;
  dataDir: string;
  error?: string;
}

export interface SystemHealthReport {
  status: HealthStatus;
  uptime: number;
  database: DatabaseHealth;
  telegram: TelegramHealth;
  liveFeed: LiveFeedHealth;
  storage: StorageHealth;
  environment: string;
  timestamp: string;
}

const startedAt = Date.now();

async function probeSupabase(): Promise<DatabaseHealth> {
  if (!isSupabaseConfigured()) {
    return {
      configured: false,
      connected: false,
      mode: "local_only",
    };
  }

  const client = getSupabaseAdmin();
  if (!client) {
    return {
      configured: true,
      connected: false,
      mode: "local_only",
      error: "client_unavailable",
    };
  }

  try {
    const { error } = await client.from("signals").select("id").limit(1);

    if (error) {
      return {
        configured: true,
        connected: false,
        mode: "local_only",
        error: error.message,
      };
    }

    return {
      configured: true,
      connected: true,
      mode: "supabase",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      configured: true,
      connected: false,
      mode: "local_only",
      error: message,
    };
  }
}

function probeTelegram(): TelegramHealth {
  const config = getTelegramConfig();
  const configured = isTelegramConfigured();

  let status: TelegramHealth["status"] = "OFFLINE";
  if (config.sandboxMode) status = "SANDBOX";
  else if (configured) status = "READY";

  return {
    sandbox: config.sandboxMode,
    configured,
    status,
  };
}

function probeLiveFeed(): LiveFeedHealth {
  const token = process.env.SPORTMONKS_API_TOKEN?.trim();
  return {
    sportmonksTokenSet: Boolean(token && token !== "your_token_here"),
    status: token ? "CONFIGURED" : "MISSING_TOKEN",
  };
}

async function probeStorage(): Promise<StorageHealth> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    await writeFile(PROBE_FILE, new Date().toISOString(), "utf8");
    await unlink(PROBE_FILE);

    return {
      jsonFallback: true,
      writable: true,
      dataDir: DATA_DIR,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      jsonFallback: true,
      writable: false,
      dataDir: DATA_DIR,
      error: message,
    };
  }
}

function aggregateStatus(
  database: DatabaseHealth,
  liveFeed: LiveFeedHealth,
  storage: StorageHealth
): HealthStatus {
  if (!storage.writable && !database.connected) return "unhealthy";
  if (!liveFeed.sportmonksTokenSet || !storage.writable) return "degraded";
  if (database.configured && !database.connected) return "degraded";
  return "healthy";
}

export async function getSystemHealthReport(): Promise<SystemHealthReport> {
  const [database, storage] = await Promise.all([
    probeSupabase(),
    probeStorage(),
  ]);

  const telegram = probeTelegram();
  const liveFeed = probeLiveFeed();
  const environment = process.env.NODE_ENV ?? "development";

  return {
    status: aggregateStatus(database, liveFeed, storage),
    uptime: Math.floor((Date.now() - startedAt) / 1000),
    database,
    telegram,
    liveFeed,
    storage,
    environment,
    timestamp: new Date().toISOString(),
  };
}
