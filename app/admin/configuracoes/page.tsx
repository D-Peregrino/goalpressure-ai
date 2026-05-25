"use client";

import AdminShell from "@/components/admin/AdminShell";
import { useAuth } from "@/hooks/useAuth";

export default function AdminConfiguracoesPage() {
  const { user, isAdmin } = useAuth();

  return (
    <AdminShell>
      <h1 className="gp-admin-title">Configurações</h1>
      <div className="gp-admin-settings">
        <section>
          <h2>Acesso admin</h2>
          <p>
            {isAdmin
              ? `Administrador ativo: ${user?.email ?? "—"} (via ADMIN_EMAILS no servidor).`
              : "Sem permissão admin na sessão atual."}
          </p>
        </section>
        <section>
          <h2>Pagamentos</h2>
          <ul>
            <li>Stripe: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</li>
            <li>Mercado Pago: MERCADO_PAGO_ACCESS_TOKEN</li>
            <li>Sem chaves: checkout em modo mock (desenvolvimento)</li>
          </ul>
        </section>
        <section>
          <h2>Supabase</h2>
          <ul>
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY ou PUBLISHABLE_KEY</li>
            <li>SUPABASE_SERVICE_ROLE_KEY (servidor, recomendado)</li>
          </ul>
        </section>
        <section>
          <h2>E-mail transacional</h2>
          <p>EMAIL_PROVIDER=resend e RESEND_API_KEY — sem provider, logs em desenvolvimento.</p>
        </section>
        <section>
          <h2>Variável admin</h2>
          <p>
            ADMIN_EMAILS — lista de e-mails com acesso ao painel (somente servidor Railway/Vercel).
          </p>
        </section>
      </div>
    </AdminShell>
  );
}
