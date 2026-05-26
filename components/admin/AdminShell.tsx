"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/assinaturas", label: "Assinaturas" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
  { href: "/admin/suporte", label: "Suporte" },
  { href: "/admin/configuracoes", label: "Configurações" },
  { href: "/admin/validacao", label: "Validação" },
  { href: "/admin/quant", label: "Quant" },
];

/** Shell do painel — acesso validado em app/admin/layout (AdminGuard + /api/auth/me). */
export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="gp-admin-shell">
      <aside className="gp-admin-shell__side">
        <p className="gp-admin-shell__brand">Painel comercial</p>
        <nav>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={pathname === n.href ? "gp-admin-nav--on" : ""}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="gp-admin-shell__main">{children}</main>
    </div>
  );
}
