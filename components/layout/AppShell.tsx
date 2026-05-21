"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  FlaskConical,
  Menu,
  Radio,
  Server,
  SlidersHorizontal,
  Target,
  TestTube2,
  X,
  Zap,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const NAV = [
  { href: "/terminal", label: "Live Feed", icon: Radio },
  { href: "/ops", label: "Command Center", icon: Server },
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

  return (
    <div className="gp-shell min-h-screen text-foreground">
      <div className="gp-ambient" aria-hidden />
      <div className="gp-grid-overlay" aria-hidden />

      <header className="fixed left-0 right-0 top-0 z-50 flex h-14 items-center justify-between border-b border-white/5 bg-[#050608]/80 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/" className="font-sans text-sm font-semibold tracking-tight">
          Goal<span className="text-pressure">Pressure</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10"
          aria-label="Menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </header>

      <aside className="gp-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-white/5 lg:flex">
        <div className="border-b border-white/5 px-5 py-6">
          <Link href="/" className="block">
            <p className="font-sans text-lg font-semibold tracking-tight">
              Goal<span className="text-pressure">Pressure</span>
            </p>
            <p className="mt-1 gp-label">Quant Intelligence</p>
          </Link>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active =
              pathname === href ||
              (href === "/ops" && pathname.startsWith("/live"));
            return (
              <Link
                key={href}
                href={href}
                className={`gp-nav-item ${active ? "gp-nav-item--active" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                <span>{label}</span>
                {active && (
                  <motion.span
                    layoutId="nav-glow"
                    className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r bg-pressure"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/5 p-4">
          <Link href="/" className="gp-label hover:text-foreground transition-colors">
            ← Marketing site
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
              className="fixed inset-0 z-50 bg-black/70 lg:hidden"
              onClick={() => setOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              className="fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col border-r border-white/5 bg-[#050608] lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-white/5 px-4 py-4">
                <span className="font-sans font-semibold">Navigation</span>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 space-y-0.5 p-3">
                {NAV.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setOpen(false)}
                    className="gp-nav-item"
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

      <main className="relative z-10 min-h-screen pt-14 lg:ml-[260px] lg:pt-0">
        {(title || subtitle) && (
          <div className="border-b border-white/5 px-5 py-6 sm:px-8 lg:px-10">
            {subtitle && <p className="gp-label mb-2">{subtitle}</p>}
            {title && (
              <h1 className="font-sans text-2xl font-semibold tracking-tight sm:text-3xl">
                {title}
              </h1>
            )}
          </div>
        )}
        <div className="px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
