"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { loginUrl } from "@/lib/auth/routes";
import AppLoading from "@/components/layout/AppLoading";

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

  useEffect(() => {
    if (!loading && !user) {
      router.replace(loginUrl(pathname));
    }
  }, [loading, user, pathname, router]);

  if (loading) {
    return fallback ?? <AppLoading label="Verificando sessão…" />;
  }

  if (!user) return null;

  return <>{children}</>;
}
