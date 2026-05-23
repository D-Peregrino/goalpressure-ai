"use client";

import { Suspense } from "react";
import AuthLayout from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/AuthForm";
import GuestGuard from "@/components/layout/GuestGuard";
import AppLoading from "@/components/layout/AppLoading";

export default function EntrarPage() {
  return (
    <AuthLayout title="Entrar" subtitle="Acesse sua central ao vivo.">
      <Suspense fallback={<AppLoading />}>
        <GuestGuard>
          <LoginForm />
        </GuestGuard>
      </Suspense>
    </AuthLayout>
  );
}
