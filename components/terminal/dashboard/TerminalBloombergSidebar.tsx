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
  { id: "live-matches", label: "Jogos ao vivo", icon: Radio },
  { id: "pressure-radar", label: "Radar de pressão", icon: Gauge },
  { id: "ev-signals", label: "Sinais de valor", icon: Zap },
  { id: "autonomous-core", label: "Núcleo autônomo", icon: Brain },
  { id: "dispatch-center", label: "Central de alertas", icon: Send },
  { id: "learning-layer", label: "Aprendizado", icon: Sparkles },
  { id: "telegram-logs", label: "Registros Telegram", icon: Activity },
  { id: "settings", label: "Configurações", icon: Settings },
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
        className={cn("gp-bloomberg__sidebar", mobileOpen && "gp-bloomberg__sidebar--open")}
      >
        <div className="gp-bloomberg__brand">
          Goal<span>Pressure</span>
          <div className="mt-1.5 text-[10px] font-normal tracking-wide text-[#AAB6C5] normal-case">
            Central esportiva
          </div>
        </div>

        <nav className="gp-bloomberg__nav" aria-label="Módulos da central">
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

        <div className="mt-auto border-t border-[#2A3A52] pt-3 text-[10px] text-[#AAB6C5] px-2">
          Análise profissional · v2
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
