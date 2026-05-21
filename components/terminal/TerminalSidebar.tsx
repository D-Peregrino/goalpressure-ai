"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LayoutDashboard,
  Radio,
  SlidersHorizontal,
  Target,
  TestTube2,
} from "lucide-react";
import { BRAND } from "@/lib/design/brand";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TIERS } from "@/lib/subscription/tiers";

const STORAGE_KEY = "gp-sidebar-collapsed";

const BASE_NAV = [
  { href: "/terminal", label: "Operations", icon: LayoutDashboard },
  { href: "/feed", label: "Live Feed", icon: Radio },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/validation", label: "Validation", icon: TestTube2 },
  { href: "/backtest", label: "Backtest", icon: Target },
  { href: "/research", label: "Research", icon: FlaskConical },
  { href: "/models", label: "Models", icon: SlidersHorizontal },
] as const;

export default function TerminalSidebar({
  isActive,
}: {
  isActive: (href: string) => boolean;
}) {
  const { tier, can } = useSubscription();
  const [collapsed, setCollapsed] = useState(false);
  const nav = can("ops")
    ? [...BASE_NAV, { href: "/ops", label: "Ops", icon: LayoutDashboard }]
    : [...BASE_NAV];

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return (
    <aside
      className={`gp-sidebar ${collapsed ? "gp-sidebar--collapsed" : ""}`}
      aria-label="Navegação institucional"
    >
      <div className="gp-sidebar__brand">
        <Link href="/" className="gp-sidebar__logo" title={BRAND.name}>
          {collapsed ? (
            <span className="gp-sidebar__mark">GP</span>
          ) : (
            <>
              Goal<span className="gp-accent">Pressure</span>
            </>
          )}
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="gp-sidebar__collapse"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="gp-sidebar__nav">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`gp-sidebar__link ${active ? "gp-sidebar__link--active" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="gp-sidebar__footer">
        {!collapsed && (
          <>
            <span className={`gp-tier-badge gp-tier-badge--${tier}`}>
              {TIERS[tier].name}
            </span>
            <p className="gp-sidebar__meta">Quant Terminal · V2</p>
          </>
        )}
        <Link href="/login" className="gp-sidebar__home-link text-xs">
          {collapsed ? "◎" : "Conta / upgrade"}
        </Link>
        <Link href="/" className="gp-sidebar__home-link">
          {collapsed ? "↵" : `← ${BRAND.domain}`}
        </Link>
      </div>
    </aside>
  );
}

/** Mobile drawer nav — same items, always expanded labels */
export function TerminalSidebarMobile({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="gp-sidebar gp-sidebar--mobile">
      {BASE_NAV.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavigate}
          className={`gp-sidebar__link ${isActive(href) ? "gp-sidebar__link--active" : ""}`}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export function useTerminalNavActive(pathname: string) {
  return (href: string) => {
    if (href === "/terminal") {
      return pathname === "/terminal" || pathname === "/ops";
    }
    if (href === "/feed") return pathname === "/feed";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}
