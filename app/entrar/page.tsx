"use client";

import { Suspense } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForm";

export default function EntrarPage() {
  return (
    <AuthLayout title="Entrar" subtitle="Acesse sua central ao vivo.">
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Carregando…</p>}>
        <LoginForm />
      </Suspense>
    </AuthLayout>
  );
}
