"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const NAV = [
  { href: "/admin", label: "Painel" },
  { href: "/admin/leads", label: "Leads" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/assinaturas", label: "Assinaturas" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
  { href: "/admin/suporte", label: "Suporte" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user || user.role !== "admin") {
    return (
      <div className="gp-admin-denied">
        <p>Acesso restrito à equipe GoalPressure.</p>
        <Link href="/">Voltar ao início</Link>
      </div>
    );
  }

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
