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

const NAV = [
  { href: "/terminal", label: "Command Center", icon: Server },
  { href: "/feed", label: "Live Feed", icon: Radio },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/validation", label: "Validation", icon: TestTube2 },
  { href: "/backtest", label: "Backtest", icon: Target },
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/models", label: "Models", icon: SlidersHorizontal },
] as const;

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
    <div className="t-shell min-h-screen">
      <div className="t-ambient" aria-hidden />

      <header className="t-topbar fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between px-4 backdrop-blur-md lg:hidden">
        <Link href="/" className="font-display text-sm">
          Goal<span className="t-accent">Pressure</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="t-btn-secondary !p-2"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      <aside className="t-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[272px] flex-col lg:flex">
        <div className="border-b border-[var(--border)] px-5 py-6">
          <Link href="/">
            <p className="font-display text-lg">
              Goal<span className="t-accent">Pressure</span> AI
            </p>
            <p className="mt-1.5 t-label text-[10px]">Quant Terminal</p>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`t-nav-item ${isActive(href) ? "t-nav-item--active" : ""}`}
            >
              <Icon className="h-4 w-4 opacity-60" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-[var(--border)] p-4">
          <Link href="/" className="t-label hover:text-[var(--text)]">
            ← {BRAND.domain}
          </Link>
        </div>
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/20 lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              className="t-sidebar fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col lg:hidden"
            >
              <div className="flex justify-between border-b border-[var(--border)] p-4">
                <span className="font-display">Menu</span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Fechar">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 space-y-0.5 p-3">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className={`t-nav-item ${isActive(href) ? "t-nav-item--active" : ""}`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </Link>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="relative z-10 min-h-screen pt-14 lg:ml-[272px] lg:pt-0">
        {(title || subtitle) && (
          <div className="border-b border-[var(--border)] bg-[var(--gp-white-tech)] px-5 py-7 lg:px-10">
            {subtitle && <p className="t-label mb-2">{subtitle}</p>}
            {title && <h1 className="t-page-title">{title}</h1>}
          </div>
        )}
        <div className="px-4 py-8 sm:px-6 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
