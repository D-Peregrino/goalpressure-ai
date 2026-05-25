import AuthGuard from "@/components/layout/AuthGuard";
import AdminGuard from "@/components/layout/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <AdminGuard>{children}</AdminGuard>
    </AuthGuard>
  );
}
