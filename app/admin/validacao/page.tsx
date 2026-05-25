"use client";

import { useCallback, useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import { logAdminValidationError } from "@/lib/admin/adminValidationLog";
import {
  isOperationalValidationReport,
  parseApiErrorMessage,
  type OperationalValidationReport,
} from "@/lib/system/operationalValidation.types";

function StatusDot({ status }: { status: "ok" | "warn" | "fail" }) {
  const cls =
    status === "ok"
      ? "gp-val-status--ok"
      : status === "warn"
        ? "gp-val-status--warn"
        : "gp-val-status--fail";
  return <span className={`gp-val-status ${cls}`} aria-hidden />;
}

function ApiErrorCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="gp-val-api-error" role="alert">
      <strong>{title}</strong>
      <p>{detail}</p>
    </div>
  );
}

type SchemaApplyUiResult = {
  applied: string[];
  skipped: Array<{ file: string; reason: string }>;
  failed: Array<{ file: string; error: string; statement?: number }>;
};

function parseSchemaApplyBody(body: unknown): SchemaApplyUiResult & {
  ok: boolean;
  success: boolean;
  errors: string[];
} {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const applied = Array.isArray(record.applied)
    ? record.applied.filter((x): x is string => typeof x === "string")
    : [];
  const skipped = Array.isArray(record.skipped)
    ? record.skipped
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const file = typeof row.file === "string" ? row.file : "?";
          const reason =
            typeof row.reason === "string" ? row.reason : "ignorado (idempotente)";
          return { file, reason };
        })
        .filter((x): x is { file: string; reason: string } => x !== null)
    : [];
  const failed: SchemaApplyUiResult["failed"] = [];
  if (Array.isArray(record.failed)) {
    for (const item of record.failed) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      failed.push({
        file: typeof row.file === "string" ? row.file : "?",
        error: typeof row.error === "string" ? row.error : "erro desconhecido",
        statement: typeof row.statement === "number" ? row.statement : undefined,
      });
    }
  }
  const errors = Array.isArray(record.errors)
    ? record.errors.filter((x): x is string => typeof x === "string")
    : [];
  return {
    applied,
    skipped,
    failed,
    errors,
    ok: record.ok === true,
    success: record.success === true,
  };
}

function AdminValidacaoPageInner() {
  const [report, setReport] = useState<OperationalValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);
  const [schemaResult, setSchemaResult] = useState<SchemaApplyUiResult | null>(null);

  useEffect(() => {
    const onWindowError = (event: ErrorEvent): void => {
      logAdminValidationError(event.error ?? event.message, {
        scope: "admin_validacao_window_error",
        component: "AdminValidacaoPage",
        route: "/admin/validacao",
        extra: { filename: event.filename, lineno: event.lineno },
      });
    };
    const onUnhandled = (event: PromiseRejectionEvent): void => {
      logAdminValidationError(event.reason, {
        scope: "admin_validacao_unhandled_rejection",
        component: "AdminValidacaoPage",
        route: "/admin/validacao",
      });
    };
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandled);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandled);
    };
  }, []);

  const pushFetchError = useCallback((label: string, detail: string, cause?: unknown) => {
    logAdminValidationError(cause ?? new Error(detail), {
      scope: "admin_validacao_fetch",
      component: "AdminValidacaoPage",
      route: "/admin/validacao",
      extra: { label, detail },
    });
    setFetchErrors((prev) => [...prev, `${label}: ${detail}`]);
  }, []);

  const clearFetchErrors = useCallback(() => {
    setFetchErrors([]);
  }, []);

  const runValidation = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    clearFetchErrors();
    try {
      const res = await fetchWithAuth("/api/admin/run-validation", {
        cache: "no-store",
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        pushFetchError("Validação", "Resposta inválida do servidor.");
        setReport(null);
        return;
      }

      if (!res.ok) {
        pushFetchError(
          "Validação",
          parseApiErrorMessage(body, `HTTP ${res.status}`)
        );
        setReport(null);
        setMessage("Validação não concluída — veja o card de erro.");
        return;
      }

      if (!isOperationalValidationReport(body)) {
        pushFetchError("Validação", "Formato de relatório inesperado.");
        setReport(null);
        return;
      }

      setReport(body);
      setMessage(
        body.ok
          ? "Validação concluída — sistema operacional."
          : "Validação com pendências."
      );
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Falha na validação";
      pushFetchError("Validação", detail, e);
      setMessage(detail);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [clearFetchErrors, pushFetchError]);

  const applySchemas = useCallback(async () => {
    setSchemaLoading(true);
    setMessage(null);
    setSchemaResult(null);
    clearFetchErrors();
    try {
      const res = await fetchWithAuth("/api/admin/apply-schemas", { method: "POST" });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        pushFetchError("Schemas", "Resposta inválida do servidor.");
        return;
      }

      const parsed = parseSchemaApplyBody(body);
      setSchemaResult({
        applied: parsed.applied,
        skipped: parsed.skipped,
        failed: parsed.failed,
      });

      if (!res.ok) {
        const detail =
          parsed.errors.join("; ") ||
          parseApiErrorMessage(body, `HTTP ${res.status}`);
        pushFetchError("Schemas", detail);
        setMessage(`Falha crítica ao aplicar schemas: ${detail}`);
        return;
      }

      if (parsed.failed.length > 0) {
        for (const f of parsed.failed) {
          const stmt = f.statement ? ` (stmt ${f.statement})` : "";
          pushFetchError("Schemas", `${f.file}${stmt}: ${f.error}`);
        }
        setMessage(
          `Schemas parciais: ${parsed.applied.length} aplicados, ${parsed.failed.length} falharam, ${parsed.skipped.length} ignorados.`
        );
      } else if (parsed.ok || parsed.success) {
        setMessage(
          `Schemas aplicados (${parsed.applied.length}): ${parsed.applied.join(", ") || "—"}`
        );
      } else {
        const detail = parsed.errors.join("; ") || "Nenhum schema aplicado.";
        pushFetchError("Schemas", detail);
        setMessage(detail);
      }

      await runValidation();
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Falha ao aplicar schemas";
      pushFetchError("Schemas", detail, e);
      setMessage(detail);
    } finally {
      setSchemaLoading(false);
    }
  }, [clearFetchErrors, pushFetchError, runValidation]);

  const startRuntime = useCallback(async () => {
    setRuntimeLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/runtime/start", { cache: "no-store" });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        pushFetchError("Runtime", "Resposta inválida do servidor.");
        return;
      }

      if (!res.ok) {
        pushFetchError("Runtime", parseApiErrorMessage(body, `HTTP ${res.status}`));
        return;
      }

      const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      const ok = record.ok === true;
      const msg =
        typeof record.message === "string"
          ? record.message
          : ok
            ? "Runtime iniciado."
            : "Runtime";
      setMessage(msg);
      if (!ok) {
        pushFetchError("Runtime", msg);
      }
      await runValidation();
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Falha ao iniciar runtime";
      pushFetchError("Runtime", detail, e);
      setMessage(detail);
    } finally {
      setRuntimeLoading(false);
    }
  }, [pushFetchError, runValidation]);

  const checks = report?.checks ?? [];
  const tables = report?.tables ?? [];
  const pendingErrors = report?.pendingErrors ?? [];
  const inPlayCount = report?.sportmonks?.inPlayCount ?? 0;
  const activeDataSource = report?.activeDataSource ?? "—";
  const generatedAt = report?.generatedAt
    ? new Date(report.generatedAt).toLocaleString("pt-BR")
    : "—";

  return (
    <AdminShell>
      <h1 className="gp-admin-title">Validação operacional</h1>
      <p className="gp-admin-sub">
        Checagem ponta a ponta — SportMonks real, Supabase, engines e runtime. Sem mock e sem seed.
      </p>

      <div className="gp-val-actions">
        <button
          type="button"
          className="gp-btn gp-btn--primary"
          onClick={() => void runValidation()}
          disabled={loading}
        >
          {loading ? "Validando…" : "Rodar validação agora"}
        </button>
        <button
          type="button"
          className="gp-btn gp-btn--ghost"
          onClick={() => void applySchemas()}
          disabled={schemaLoading}
        >
          {schemaLoading ? "Aplicando…" : "Aplicar schemas Supabase"}
        </button>
        <button
          type="button"
          className="gp-btn gp-btn--ghost"
          onClick={() => void startRuntime()}
          disabled={runtimeLoading}
        >
          {runtimeLoading ? "Iniciando…" : "Iniciar runtime"}
        </button>
        <a
          href="/api/system/health-report"
          target="_blank"
          rel="noreferrer"
          className="gp-btn gp-btn--ghost gp-btn--sm"
        >
          Health report JSON
        </a>
      </div>

      {loading && (
        <p className="gp-val-message" aria-live="polite">
          Carregando validação…
        </p>
      )}

      {message && !loading && <p className="gp-val-message">{message}</p>}

      {fetchErrors.map((err, i) => (
        <ApiErrorCard key={`${i}-${err.slice(0, 24)}`} title="Falha na operação" detail={err} />
      ))}

      {schemaResult && (
        <div className="gp-val-schema-results">
          <h2 className="gp-type-title">Resultado — aplicar schemas</h2>
          {schemaResult.applied.length > 0 && (
            <div className="gp-val-schema-results__ok">
              <strong>Aplicados</strong>
              <ul>
                {schemaResult.applied.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          )}
          {schemaResult.skipped.length > 0 && (
            <div className="gp-val-schema-results__skip">
              <strong>Ignorados (idempotente)</strong>
              <ul>
                {schemaResult.skipped.map((s, i) => (
                  <li key={`${s.file}-${i}`}>
                    {s.file}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {schemaResult.failed.length > 0 && (
            <div className="gp-val-schema-results__fail">
              <strong>Falharam</strong>
              <ul>
                {schemaResult.failed.map((f, i) => (
                  <li key={`${f.file}-${i}`}>
                    {f.file}
                    {f.statement ? ` #${f.statement}` : ""}: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!loading && !report && fetchErrors.length === 0 && (
        <p className="gp-val-empty">
          Nenhuma validação executada ainda. Use &quot;Rodar validação agora&quot; para gerar o
          relatório.
        </p>
      )}

      {report && (
        <>
          <p className="gp-val-summary">
            {report.ok ? "Sistema validado" : "Pendências detectadas"} · Fonte{" "}
            <strong>{activeDataSource}</strong> · {inPlayCount} jogos in-play · {generatedAt}
          </p>

          {checks.length > 0 ? (
            <ul className="gp-val-checklist">
              {checks.map((c) => (
                <li key={c.id} className="gp-val-checklist__item">
                  <StatusDot status={c.status} />
                  <div>
                    <strong>{c.label}</strong>
                    <p>{c.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="gp-val-empty">Nenhum item no checklist.</p>
          )}

          {pendingErrors.length > 0 && (
            <div className="gp-val-errors">
              <h2 className="gp-type-title">Erros pendentes</h2>
              <ul>
                {pendingErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="gp-val-tables">
            <h2 className="gp-type-title">Tabelas engine</h2>
            {tables.length > 0 ? (
              <table className="gp-val-table">
                <thead>
                  <tr>
                    <th>Tabela</th>
                    <th>OK</th>
                    <th>Registros</th>
                    <th>Último</th>
                  </tr>
                </thead>
                <tbody>
                  {tables.map((t) => (
                    <tr key={t.name}>
                      <td>{t.name}</td>
                      <td>{t.reachable ? "sim" : "não"}</td>
                      <td className="tabular-nums">{t.rowCountEstimate ?? "—"}</td>
                      <td>
                        {t.lastRowAt ? new Date(t.lastRowAt).toLocaleString("pt-BR") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="gp-val-empty">Nenhuma tabela no relatório.</p>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}

export default function AdminValidacaoPage() {
  return (
    <AdminErrorBoundary
      title="Erro ao carregar painel de validação"
      scope="admin_validacao_page"
    >
      <AdminValidacaoPageInner />
    </AdminErrorBoundary>
  );
}
