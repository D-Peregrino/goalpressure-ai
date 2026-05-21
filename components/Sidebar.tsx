"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Cpu,
  FlaskConical,
  LayoutDashboard,
  Menu,
  Radio,
  ScrollText,
  Server,
  X,
  Zap,
} from "lucide-react";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { id: "live-games", label: "Live Feed", href: "/", icon: Radio },
  { id: "signals", label: "Signals", href: "/", icon: Zap },
  { id: "statistics", label: "Analytics", href: "/analytics", icon: BarChart3 },
  { id: "research", label: "Research Lab", href: "/research", icon: FlaskConical },
  { id: "ops", label: "Ops Terminal", href: "/ops", icon: Server },
  { id: "logs", label: "Logs", href: "/", icon: ScrollText },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 flex h-12 items-center justify-between border-b border-card bg-surface/95 px-4 backdrop-blur-sm lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center border border-card bg-card text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="font-mono text-[10px] font-bold tracking-[0.2em] text-pressure">
          GP AI TERMINAL
        </span>
        <div className="w-8" aria-hidden />
      </header>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-black/70 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-[70] flex h-screen w-[280px] flex-col border-r border-card bg-surface/95 backdrop-blur-md transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="sidebar-accent absolute left-0 top-0 h-full w-[2px] bg-gradient-to-b from-pressure via-glow to-transparent" />

        <div className="flex flex-1 flex-col overflow-y-auto p-4 pl-5">
          <div className="mb-6 flex items-start justify-between border-b border-card/80 pb-4">
            <div>
              <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.35em] text-muted">
                Command Console
              </p>
              <h1 className="mt-1 font-mono text-sm font-bold tracking-[0.12em] text-pressure">
                GP AI TERMINAL
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-pressure animate-live-blink" />
                <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.15em] text-pressure/90">
                  Pressure Engine Online
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="flex h-8 w-8 items-center justify-center border border-card bg-card text-muted lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 grid grid-cols-2 gap-2">
            <div className="telemetry-cell px-2 py-2">
              <p className="telemetry-label">Feed</p>
              <p className="telemetry-value text-pressure">LIVE</p>
            </div>
            <div className="telemetry-cell px-2 py-2">
              <p className="telemetry-label">Engine</p>
              <p className="telemetry-value">ACTIVE</p>
            </div>
          </div>

          <nav className="flex flex-1 flex-col gap-0.5">
            <p className="mb-2 px-2 font-mono text-[8px] uppercase tracking-[0.3em] text-muted/70">
              Navigation
            </p>
            {NAV_ITEMS.map(({ id, label, href, icon: Icon }) => {
              const isActive =
                href === "/analytics"
                  ? pathname === "/analytics"
                  : href === "/research"
                    ? pathname === "/research"
                    : href === "/ops"
                      ? pathname === "/ops"
                      : pathname === "/" && id === "dashboard";
              return (
                <Link
                  key={id}
                  href={href}
                  onClick={closeMobile}
                  className={`group relative flex items-center gap-2.5 border px-3 py-2.5 text-left transition-all duration-200 ${
                    isActive
                      ? "border-pressure/40 bg-card/80 text-foreground"
                      : "border-transparent text-muted hover:border-card hover:bg-card/40 hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-0 h-full w-[2px] bg-pressure" />
                  )}
                  <Icon
                    className={`h-3.5 w-3.5 shrink-0 ${
                      isActive ? "text-pressure" : "text-muted"
                    }`}
                    strokeWidth={2}
                  />
                  <span className="font-mono text-[11px] uppercase tracking-wider">
                    {label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-4 space-y-2 border-t border-card/80 pt-4">
            <div className="telemetry-cell flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Cpu className="h-3 w-3 text-muted" />
                <span className="telemetry-label">Signal Core</span>
              </div>
              <span className="font-mono text-[10px] font-bold text-pressure">
                ONLINE
              </span>
            </div>
            <div className="telemetry-cell flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Activity className="h-3 w-3 text-muted" />
                <span className="telemetry-label">Uplink</span>
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted">
                STABLE
              </span>
            </div>
            <p className="px-1 font-mono text-[8px] uppercase tracking-widest text-muted/60">
              v0.1.0 · Build 2026.1
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
