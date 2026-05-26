"use client";

import {
  Activity,
  Brain,
  Gauge,
  Menu,
  Radio,
  Send,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const TERMINAL_SECTIONS = [
  { id: "live-matches", label: "Live Matches", icon: Radio },
  { id: "pressure-radar", label: "Pressure Radar", icon: Gauge },
  { id: "ev-signals", label: "EV Signals", icon: Zap },
  { id: "autonomous-core", label: "Autonomous Core", icon: Brain },
  { id: "dispatch-center", label: "Dispatch Center", icon: Send },
  { id: "learning-layer", label: "Learning Layer", icon: Sparkles },
  { id: "telegram-logs", label: "Telegram Logs", icon: Activity },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

export type TerminalSectionId = (typeof TERMINAL_SECTIONS)[number]["id"];

export default function TerminalBloombergSidebar({
  active,
  onSelect,
  mobileOpen,
  onMobileClose,
}: {
  active: TerminalSectionId;
  onSelect: (id: TerminalSectionId) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}) {
  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="gp-bloomberg__overlay lg:hidden"
          aria-label="Fechar menu"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "gp-bloomberg__sidebar",
          mobileOpen && "gp-bloomberg__sidebar--open"
        )}
      >
        <div className="gp-bloomberg__brand">
          Goal<span>Pressure</span>
          <div className="mt-1 text-[9px] font-normal tracking-[0.2em] text-[#F4F7FA]/40">
            Ops Terminal
          </div>
        </div>

        <nav className="gp-bloomberg__nav" aria-label="Módulos do terminal">
          {TERMINAL_SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={cn(
                "gp-bloomberg__nav-btn",
                active === id && "gp-bloomberg__nav-btn--active"
              )}
              onClick={() => {
                onSelect(id);
                onMobileClose();
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-auto border-t border-[#1A222C] pt-3 text-[10px] text-[#F4F7FA]/40 px-2">
          Institutional · v2.0
        </div>
      </aside>
    </>
  );
}

export function TerminalMobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClick} aria-label="Menu">
      <Menu className="h-5 w-5" />
    </Button>
  );
}
