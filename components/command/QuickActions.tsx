"use client";

import { Star, Bookmark, VolumeX, LayoutGrid } from "lucide-react";
import { useCommandPalette } from "@/contexts/CommandContext";
import { getQuickActionCommands } from "@/lib/command/commandRegistry";

const ICONS: Record<string, typeof Star> = {
  "qa-favorites": Star,
  "qa-live": LayoutGrid,
  "action-multiview-4": LayoutGrid,
};

export default function QuickActions() {
  const { execute, query } = useCommandPalette();
  if (query.trim()) return null;

  const actions = getQuickActionCommands().slice(0, 4);

  return (
    <div className="gp-cmd-quick">
      <span className="gp-cmd-quick__label">Ações rápidas</span>
      <div className="gp-cmd-quick__row">
        {actions.map((a) => {
          const Icon = ICONS[a.id] ?? Bookmark;
          return (
            <button
              key={a.id}
              type="button"
              className="gp-cmd-quick__btn"
              onClick={() => execute(a)}
            >
              <Icon className="h-3.5 w-3.5" />
              {a.title.replace(/^Ver /, "")}
            </button>
          );
        })}
        <button
          type="button"
          className="gp-cmd-quick__btn"
          onClick={() =>
            execute({
              id: "quick-mute",
              title: "Silenciar liga",
              keywords: ["mute"],
              group: "Ações rápidas",
              kind: "action",
              action: {
                type: "workspace",
                op: "mute-league",
                leagueName: "Premier League",
              },
            })
          }
        >
          <VolumeX className="h-3.5 w-3.5" />
          Silenciar
        </button>
      </div>
    </div>
  );
}
