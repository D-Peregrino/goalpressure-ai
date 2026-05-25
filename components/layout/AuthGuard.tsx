"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { loginUrl } from "@/lib/auth/routes";
import { clearStaleAuthSession } from "@/lib/auth/clearStaleAuthSession";
import AppLoading from "@/components/layout/AppLoading";
import { logAdminAuth } from "@/lib/admin/adminAuthLog";

export default function AuthGuard({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/admin");
  const navigatedRef = useRef(false);

  const goToLogin = useCallback(async () => {
    const target = loginUrl(pathname, { reauth: true });
    logAdminAuth("[ADMIN_AUTH]", {
      scope: "go_to_login",
      route: pathname,
      message: target,
    });
    await clearStaleAuthSession("auth_guard_manual_login");
    window.location.assign(target);
  }, [pathname]);

  useEffect(() => {
    if (loading || user) {
      navigatedRef.current = false;
      return;
    }

    if (navigatedRef.current) return;
    navigatedRef.current = true;

    logAdminAuth("[ADMIN_AUTH]", {
      scope: "session_missing",
      route: pathname,
      message: "redirecting_to_reauth_login",
    });

    void (async () => {
      await clearStaleAuthSession("auth_guard_auto_redirect");
      const target = loginUrl(pathname, { reauth: true });
      if (
        typeof window !== "undefined" &&
        `${window.location.pathname}${window.location.search}` !== target
      ) {
        window.location.assign(target);
      }
    })();
  }, [loading, user, pathname]);

  if (loading) {
    return fallback ?? <AppLoading label="Verificando sessão…" />;
  }

  if (!user) {
    return (
      <div className="gp-admin-denied">
        <h2>Sessão necessária</h2>
        <p>
          Faça login com sua conta de administrador para acessar o painel de validação.
        </p>
        <div className="gp-admin-denied__actions">
          <button type="button" className="gp-btn gp-btn--primary" onClick={() => void goToLogin()}>
            Entrar
          </button>
        </div>
        {isAdminRoute && (
          <p className="gp-admin-denied__hint">
            Se o botão não responder, limpe os cookies do site e tente novamente.
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
