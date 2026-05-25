"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logAdminValidationError } from "@/lib/admin/adminValidationLog";

export default function AdminSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logAdminValidationError(error, {
      scope: "admin_segment_error",
      route: "/admin",
      extra: { digest: error.digest },
    });
  }, [error]);

  return (
    <div className="gp-admin-error-fallback" role="alert">
      <h2>Erro ao carregar painel de validação</h2>
      <p className="gp-admin-error-fallback__detail">
        {error.message || "Falha inesperada no painel admin."}
      </p>
      <div className="gp-admin-error-fallback__actions">
        <button type="button" className="gp-btn gp-btn--primary" onClick={() => reset()}>
          Tentar novamente
        </button>
        <Link href="/admin" className="gp-btn gp-btn--ghost">
          Voltar ao painel
        </Link>
      </div>
    </div>
  );
}
