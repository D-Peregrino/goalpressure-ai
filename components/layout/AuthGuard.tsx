"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { loginUrl } from "@/lib/auth/routes";
import AppLoading from "@/components/layout/AppLoading";
import { logAdminValidationError } from "@/lib/admin/adminValidationLog";

export default function AuthGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");

  useEffect(() => {
    if (!loading && !user) {
      router.replace(loginUrl(pathname));
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return fallback ?? <AppLoading label="Verificando sessão…" />;
  }

  if (!user) {
    if (isAdminRoute) {
      logAdminValidationError(new Error("Sessão ausente no painel admin"), {
        scope: "auth_guard",
        route: pathname,
        component: "AuthGuard",
      });
    }

    return (
      <div className="gp-admin-denied">
        <h2>Sessão necessária</h2>
        <p>Redirecionando para login… Se não redirecionar, use o botão abaixo.</p>
        <div className="gp-admin-denied__actions">
          <Link href={loginUrl(pathname)} className="gp-btn gp-btn--primary">
            Entrar
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
