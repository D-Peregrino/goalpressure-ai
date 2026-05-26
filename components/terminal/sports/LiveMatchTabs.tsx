"use client";

import { cn } from "@/lib/utils";

export const MATCH_TABS = [
  { id: "pre", label: "Pré" },
  { id: "live", label: "Ao vivo" },
  { id: "odds", label: "Cotações" },
  { id: "stats", label: "Estatísticas" },
  { id: "players", label: "Jogadores" },
  { id: "traits", label: "Características" },
  { id: "h2h", label: "Confronto direto" },
] as const;

export type MatchTabId = (typeof MATCH_TABS)[number]["id"];

export default function LiveMatchTabs({
  active,
  onChange,
}: {
  active: MatchTabId;
  onChange: (id: MatchTabId) => void;
}) {
  return (
    <div className="gp-sports__tabs-wrap overflow-x-auto">
      <div className="flex gap-0 min-w-max">
        {MATCH_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "px-3 py-2.5 text-sm font-medium border-b-2 transition-colors",
              active === tab.id
                ? "border-[#FF2B5F] text-[#1B2430]"
                : "border-transparent text-[#6B7280] hover:text-[#1B2430]"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
