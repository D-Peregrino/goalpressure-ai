/**
 * Tipos da validação operacional — seguros para import no client (sem deps Node).
 */

export type ValidationStatus = "ok" | "warn" | "fail";

export interface ValidationCheck {
  id: string;
  label: string;
  status: ValidationStatus;
  detail: string;
}

export interface TableProbe {
  name: string;
  exists: boolean;
  reachable: boolean;
  rowCountEstimate: number | null;
  lastRowAt: string | null;
  error: string | null;
}

export interface RecentSample {
  fixtureId?: string;
  createdAt?: string;
  summary?: string;
}

export interface OperationalValidationReport {
  ok: boolean;
  generatedAt: string;
  activeDataSource: string;
  seedDisabled: boolean;
  sportmonks: {
    configured: boolean;
    connected: boolean;
    inPlayCount: number;
    diagnosticOk: boolean;
    error: string | null;
  };
  supabase: {
    configured: boolean;
    connected: boolean;
    projectUrl: string | null;
    databaseUrlConfigured: boolean;
    error: string | null;
  };
  telegram: {
    configured: boolean;
    sandbox: boolean;
    ready: boolean;
    status: string;
  };
  tables: TableProbe[];
  schemasExpected: string[];
  recent: {
    matches: RecentSample[];
    pressureSnapshots: RecentSample[];
    evSignals: RecentSample[];
    operationalInsights: RecentSample[];
    dispatches: RecentSample[];
    autonomousDecisions: RecentSample[];
    historicalOutcomes: RecentSample[];
  };
  engines: {
    pressure: ValidationStatus;
    ev: ValidationStatus;
    ops: ValidationStatus;
    learning: ValidationStatus;
    execution: ValidationStatus;
    autonomous: ValidationStatus;
  };
  runtime: {
    active: boolean;
    lastPollAt: string | null;
    lastError: string | null;
  };
  production: {
    domain: string | null;
    isProduction: boolean;
  };
  pendingErrors: string[];
  checks: ValidationCheck[];
}

export function isOperationalValidationReport(
  value: unknown
): value is OperationalValidationReport {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return Array.isArray(r.checks) && typeof r.generatedAt === "string";
}

export function parseApiErrorMessage(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const err = (body as Record<string, unknown>).error;
  if (typeof err === "string" && err.trim()) return err;
  const msg = (body as Record<string, unknown>).message;
  if (typeof msg === "string" && msg.trim()) return msg;
  return fallback;
}
