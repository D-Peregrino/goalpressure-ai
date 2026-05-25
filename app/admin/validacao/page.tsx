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

function AdminValidacaoPageInner() {
  const [report, setReport] = useState<OperationalValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fetchErrors, setFetchErrors] = useState<string[]>([]);

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
    try {
      const res = await fetchWithAuth("/api/admin/apply-schemas", { method: "POST" });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        pushFetchError("Schemas", "Resposta inválida do servidor.");
        return;
      }

      if (!res.ok) {
        pushFetchError("Schemas", parseApiErrorMessage(body, `HTTP ${res.status}`));
        return;
      }

      const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
      if (record.ok === true) {
        const applied = Array.isArray(record.applied)
          ? (record.applied as string[]).join(", ")
          : "—";
        setMessage(`Schemas aplicados: ${applied}`);
      } else {
        const errors = Array.isArray(record.errors)
          ? (record.errors as string[]).join("; ")
          : parseApiErrorMessage(body, "Falha ao aplicar schemas");
        pushFetchError("Schemas", errors);
        setMessage(`Erros schema: ${errors}`);
      }
      await runValidation();
    } catch (e) {
      const detail = e instanceof Error ? e.message : "Falha ao aplicar schemas";
      pushFetchError("Schemas", detail, e);
      setMessage(detail);
    } finally {
      setSchemaLoading(false);
    }
  }, [pushFetchError, runValidation]);

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
