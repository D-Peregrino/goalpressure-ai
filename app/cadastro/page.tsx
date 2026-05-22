"use client";

import { Suspense } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/AuthForm";

export default function CadastroPage() {
  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Comece grátis ou ative o Plano Fundador na sequência."
    >
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Carregando…</p>}>
        <SignupForm />
      </Suspense>
    </AuthLayout>
  );
}
