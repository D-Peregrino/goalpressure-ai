"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  FlaskConical,
  Menu,
  Radio,
  Server,
  SlidersHorizontal,
  Target,
  TestTube2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BRAND } from "@/lib/design/brand";

const SIDEBAR_WIDTH = 280;

const NAV = [
  { href: "/terminal", label: "Command Center", icon: Server },
  { href: "/feed", label: "Live Feed", icon: Radio },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/validation", label: "Validation", icon: TestTube2 },
  { href: "/backtest", label: "Backtest", icon: Target },
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/models", label: "Models", icon: SlidersHorizontal },
] as const;

function SidebarNav({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      <div className="shrink-0 border-b border-[var(--border)] px-5 py-6">
        <Link href="/" onClick={onNavigate}>
          <p className="font-display text-lg">
            Goal<span className="t-accent">Pressure</span> AI
          </p>
          <p className="mt-1.5 t-label text-[10px]">Quant Terminal</p>
        </Link>
      </div>
      <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`t-nav-item ${isActive(href) ? "t-nav-item--active" : ""}`}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-60" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="shrink-0 border-t border-[var(--border)] p-4">
        <Link href="/" onClick={onNavigate} className="t-label hover:text-[var(--text)]">
          ← {BRAND.domain}
        </Link>
      </div>
    </>
  );
}

export default function AppShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/terminal") {
      return pathname === "/terminal" || pathname === "/ops";
    }
    if (href === "/feed") return pathname === "/feed";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="t-shell app-shell">
      <div className="t-ambient pointer-events-none" aria-hidden />

      {/* Desktop: sidebar no fluxo flex — nunca cobre o main */}
      <aside
        className="app-shell__sidebar t-sidebar"
        style={{ width: SIDEBAR_WIDTH }}
        aria-label="Navegação principal"
      >
        <SidebarNav isActive={isActive} />
      </aside>

      <div className="app-shell__main">
        <header className="t-topbar sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--gp-white-tech)] px-4 lg:hidden">
          <Link href="/" className="font-display text-sm">
            Goal<span className="t-accent">Pressure</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="t-btn-secondary !p-2"
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
        </header>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/25 lg:hidden"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="t-sidebar t-sidebar--drawer flex flex-col lg:hidden"
                style={{ width: SIDEBAR_WIDTH }}
              >
                <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] p-4">
                  <span className="font-display">Menu</span>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Fechar menu">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <SidebarNav isActive={isActive} onNavigate={() => setOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="relative z-10 flex min-h-0 flex-1 flex-col pt-0">
          {(title || subtitle) && (
            <div className="shrink-0 border-b border-[var(--border)] bg-[var(--gp-white-tech)] px-5 py-7 lg:px-8">
              {subtitle && <p className="t-label mb-2">{subtitle}</p>}
              {title && <h1 className="t-page-title">{title}</h1>}
            </div>
          )}
          <div className="app-shell__content">{children}</div>
        </main>
      </div>
    </div>
  );
}
