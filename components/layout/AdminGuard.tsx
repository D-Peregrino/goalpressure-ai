"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { hasAdminAccess } from "@/lib/auth/entitlements";
import AppLoading from "@/components/layout/AppLoading";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const allowed = isAdmin || (user ? hasAdminAccess(user.role) : false);

  if (loading) {
    return <AppLoading label="Verificando acesso admin…" />;
  }

  if (!user) {
    return (
      <div className="gp-admin-denied">
        <h2>Faça login</h2>
        <p>Entre com sua conta de administrador para acessar esta área.</p>
        <div className="gp-admin-denied__actions">
          <Link href="/entrar?redirect=%2Fadmin%2Fvalidacao&reauth=1" className="gp-btn gp-btn--primary">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="gp-admin-denied">
        <h2>Acesso restrito</h2>
        <p>Esta área é exclusiva para administradores do GoalPressure.</p>
        <div className="gp-admin-denied__actions">
          <Link href="/minha-central" className="gp-btn gp-btn--primary">
            Minha central
          </Link>
          <Link href="/terminal" className="gp-btn gp-btn--secondary">
            Central ao vivo
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
