"use client";

import Link from "next/link";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Home,
  Radio,
  Settings2,
  SlidersHorizontal,
  Target,
  TestTube2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { BRAND } from "@/lib/design/brand";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TIERS } from "@/lib/subscription/tiers";
import { BRAND_PRODUCT, navItemsForTier } from "@/lib/ux/productCopy";
import type { LucideIcon } from "lucide-react";

const STORAGE_KEY = "gp-sidebar-collapsed";

const NAV_ICONS: Record<string, LucideIcon> = {
  "/inicio": Home,
  "/terminal": Radio,
  "/feed": Radio,
  "/analytics": BarChart3,
  "/validation": TestTube2,
  "/backtest": Target,
  "/research": FlaskConical,
  "/models": SlidersHorizontal,
  "/ops": Settings2,
};

export default function TerminalSidebar({
  isActive,
}: {
  isActive: (href: string) => boolean;
}) {
  const { tier, can } = useSubscription();
  const [collapsed, setCollapsed] = useState(false);
  const nav = navItemsForTier(tier, can("ops"));

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
      aria-label="Navegação principal"
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
        {nav.map(({ href, label, short }) => {
          const Icon = NAV_ICONS[href] ?? Home;
          const active = isActive(href);
          const displayLabel = collapsed ? short : label;
          return (
            <Link
              key={href}
              href={href}
              className={`gp-sidebar__link ${active ? "gp-sidebar__link--active" : ""}`}
              title={collapsed ? label : undefined}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
              {!collapsed && <span>{displayLabel}</span>}
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
            <p className="gp-sidebar__meta">{BRAND_PRODUCT.footer}</p>
          </>
        )}
        <Link href="/conta" className="gp-sidebar__account-link">
          {collapsed ? "◎" : "Minha conta"}
        </Link>
        <Link href="/precos" className="gp-sidebar__home-link text-xs">
          {collapsed ? "◎" : "Planos"}
        </Link>
        <Link href="/" className="gp-sidebar__home-link">
          {collapsed ? "↵" : `← ${BRAND.domain}`}
        </Link>
      </div>
    </aside>
  );
}

export function TerminalSidebarMobile({
  isActive,
  onNavigate,
}: {
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  const { tier, can } = useSubscription();
  const nav = navItemsForTier(tier, can("ops"));

  return (
    <nav className="gp-sidebar gp-sidebar--mobile">
      {nav.map(({ href, label, short }) => {
        const Icon = NAV_ICONS[href] ?? Home;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`gp-sidebar__link ${isActive(href) ? "gp-sidebar__link--active" : ""}`}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function useTerminalNavActive(pathname: string) {
  return (href: string) => {
    if (href === "/inicio") {
      return pathname === "/inicio";
    }
    if (href === "/terminal") {
      return pathname === "/terminal" || pathname === "/ops";
    }
    if (href === "/feed") return pathname === "/feed";
    return pathname === href || pathname.startsWith(`${href}/`);
  };
}
