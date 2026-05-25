"use client";

import AuthGuard from "@/components/layout/AuthGuard";
import AdminGuard from "@/components/layout/AdminGuard";
import AdminErrorBoundary from "@/components/admin/AdminErrorBoundary";

export default function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminErrorBoundary
      title="Erro ao carregar painel de validação"
      scope="admin_layout"
    >
      <AuthGuard>
        <AdminGuard>{children}</AdminGuard>
      </AuthGuard>
    </AdminErrorBoundary>
  );
}
