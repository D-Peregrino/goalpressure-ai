"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { isReauthLoginRequest } from "@/lib/auth/routes";
import { logAdminAuth } from "@/lib/admin/adminAuthLog";
import AppLoading from "@/components/layout/AppLoading";

/** Redireciona usuário já logado para central ou redirect param. */
export default function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const reauth = isReauthLoginRequest(params);
  const redirectedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || reauth) return;
    if (redirectedRef.current) return;
    redirectedRef.current = true;

    const redirect = params.get("redirect") ?? "/minha-central";
    logAdminAuth("[ADMIN_AUTH]", {
      scope: "guest_guard_redirect",
      route: redirect,
      message: "already_authenticated",
    });
    router.replace(redirect.startsWith("/") ? redirect : "/minha-central");
  }, [loading, user, params, router, reauth]);

  if (loading) {
    return <AppLoading label="Carregando…" />;
  }

  if (user && !reauth) {
    return <AppLoading label="Redirecionando…" />;
  }

  return <>{children}</>;
}
