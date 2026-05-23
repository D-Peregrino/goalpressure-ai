"use client";

import { Suspense } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/AuthForm";
import GuestGuard from "@/components/layout/GuestGuard";
import AppLoading from "@/components/layout/AppLoading";

export default function CadastroPage() {
  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Comece grátis ou ative o Plano Fundador na sequência."
    >
      <Suspense fallback={<AppLoading />}>
        <GuestGuard>
          <SignupForm />
        </GuestGuard>
      </Suspense>
    </AuthLayout>
  );
}
