"use client";

import AdminShell from "@/components/admin/AdminShell";
import { adminAreaEnabled } from "@/lib/auth/admin";

export default function AdminConfiguracoesPage() {
  const enabled = adminAreaEnabled();

  return (
    <AdminShell>
      <h1 className="gp-admin-title">Configurações</h1>
      <div className="gp-admin-settings">
        <section>
          <h2>Acesso admin</h2>
          <p>
            {enabled
              ? "Painel ativo via ADMIN_EMAILS no servidor."
              : "Defina ADMIN_EMAILS (e-mails separados por vírgula) para habilitar o painel."}
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
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>SUPABASE_SERVICE_ROLE_KEY (servidor)</li>
          </ul>
        </section>
        <section>
          <h2>E-mail transacional</h2>
          <p>EMAIL_PROVIDER=resend e RESEND_API_KEY — sem provider, logs em desenvolvimento.</p>
        </section>
      </div>
    </AdminShell>
  );
}
