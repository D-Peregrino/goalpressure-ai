"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import AppLoading from "@/components/layout/AppLoading";

/** Redireciona usuário já logado para central ou redirect param. */
export default function GuestGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    if (!loading && user) {
      const redirect = params.get("redirect") ?? "/minha-central";
      router.replace(redirect);
    }
  }, [loading, user, params, router]);

  if (loading) {
    return <AppLoading label="Carregando…" />;
  }

  if (user) return null;

  return <>{children}</>;
}
