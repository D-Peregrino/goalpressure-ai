"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TerminalSidebar, {
  TerminalSidebarMobile,
  useTerminalNavActive,
} from "@/components/terminal/TerminalSidebar";

export default function AppShell({
  children,
  title,
  subtitle,
  intro,
  darkPremium = true,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  intro?: string;
  darkPremium?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = useTerminalNavActive(pathname);

  return (
    <div
      className={`gp-app-shell ${darkPremium ? "gp-app-shell--central" : ""}`}
    >
      <div className="gp-app-shell__ambient" aria-hidden />

      <TerminalSidebar isActive={isActive} />

      <div className="gp-app-shell__main">
        <header className="gp-mobile-topbar lg:hidden">
          <Link href="/" className="gp-mobile-topbar__brand">
            Goal<span className="gp-accent">Pressure</span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="gp-icon-btn"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <AnimatePresence>
          {open && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="gp-drawer-overlay lg:hidden"
                onClick={() => setOpen(false)}
                aria-hidden
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 28, stiffness: 320 }}
                className="gp-drawer lg:hidden"
              >
                <div className="gp-drawer__head">
                  <span className="font-display text-sm">Menu</span>
                  <button type="button" onClick={() => setOpen(false)} aria-label="Fechar">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <TerminalSidebarMobile
                  isActive={isActive}
                  onNavigate={() => setOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="gp-app-shell__content-wrap">
          {(title || subtitle || intro) && (
            <div className="gp-sport-page-heading">
              {subtitle && (
                <p className="gp-sport-page-heading__eyebrow">{subtitle}</p>
              )}
              {title && (
                <h1 className="gp-sport-page-heading__title">{title}</h1>
              )}
              {intro && (
                <p className="gp-sport-page-heading__intro">{intro}</p>
              )}
            </div>
          )}
          <div className="gp-app-shell__content">{children}</div>
        </main>
      </div>
    </div>
  );
}
