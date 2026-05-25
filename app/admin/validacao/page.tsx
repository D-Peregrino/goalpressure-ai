"use client";

import { useCallback, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import { fetchWithAuth } from "@/lib/auth/fetchWithAuth";
import type { OperationalValidationReport } from "@/lib/system/operationalValidation";

function StatusDot({ status }: { status: "ok" | "warn" | "fail" }) {
  const cls =
    status === "ok"
      ? "gp-val-status--ok"
      : status === "warn"
        ? "gp-val-status--warn"
        : "gp-val-status--fail";
  return <span className={`gp-val-status ${cls}`} aria-hidden />;
}

export default function AdminValidacaoPage() {
  const [report, setReport] = useState<OperationalValidationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [schemaLoading, setSchemaLoading] = useState(false);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runValidation = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth("/api/admin/run-validation", {
        cache: "no-store",
      });
      const body = await res.json();
      setReport(body);
      setMessage(body.ok ? "Validação concluída — sistema operacional." : "Validação com pendências.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha na validação");
    } finally {
      setLoading(false);
    }
  }, []);

  const applySchemas = useCallback(async () => {
    setSchemaLoading(true);
    setMessage(null);
    try {
      const res = await fetchWithAuth("/api/admin/apply-schemas", { method: "POST" });
      const body = await res.json();
      if (body.ok) {
        setMessage(`Schemas aplicados: ${(body.applied as string[]).join(", ")}`);
      } else {
        setMessage(`Erros schema: ${(body.errors as string[]).join("; ")}`);
      }
      await runValidation();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao aplicar schemas");
    } finally {
      setSchemaLoading(false);
    }
  }, [runValidation]);

  const startRuntime = useCallback(async () => {
    setRuntimeLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/runtime/start", { cache: "no-store" });
      const body = await res.json();
      setMessage(body.ok ? "Runtime iniciado." : body.message ?? "Runtime");
      await runValidation();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Falha ao iniciar runtime");
    } finally {
      setRuntimeLoading(false);
    }
  }, [runValidation]);

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

      {message && <p className="gp-val-message">{message}</p>}

      {report && (
        <>
          <p className="gp-val-summary">
            {report.ok ? "Sistema validado" : "Pendências detectadas"} · Fonte{" "}
            <strong>{report.activeDataSource}</strong> · {report.sportmonks.inPlayCount} jogos
            in-play · {new Date(report.generatedAt).toLocaleString("pt-BR")}
          </p>

          <ul className="gp-val-checklist">
            {report.checks.map((c) => (
              <li key={c.id} className="gp-val-checklist__item">
                <StatusDot status={c.status} />
                <div>
                  <strong>{c.label}</strong>
                  <p>{c.detail}</p>
                </div>
              </li>
            ))}
          </ul>

          {report.pendingErrors.length > 0 && (
            <div className="gp-val-errors">
              <h2 className="gp-type-title">Erros pendentes</h2>
              <ul>
                {report.pendingErrors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="gp-val-tables">
            <h2 className="gp-type-title">Tabelas engine</h2>
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
                {report.tables.map((t) => (
                  <tr key={t.name}>
                    <td>{t.name}</td>
                    <td>{t.reachable ? "sim" : "não"}</td>
                    <td className="tabular-nums">{t.rowCountEstimate ?? "—"}</td>
                    <td>{t.lastRowAt ? new Date(t.lastRowAt).toLocaleString("pt-BR") : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminShell>
  );
}
