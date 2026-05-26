"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { useCommandPalette } from "@/contexts/CommandContext";
import CommandResults from "@/components/command/CommandResults";
import CommandShortcuts from "@/components/command/CommandShortcuts";
import QuickActions from "@/components/command/QuickActions";
import "@/app/styles/command-palette.css";

export default function CommandPalette() {
  const { open, setOpen, query, setQuery, results, execute, loading } = useCommandPalette();
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setActiveIndex(0), [query, results.length]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[activeIndex]) {
        e.preventDefault();
        execute(results[activeIndex]!);
      }
    },
    [activeIndex, execute, results]
  );

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="gp-cmd-overlay"
      role="presentation"
      onClick={() => setOpen(false)}
    >
      <div
        className="gp-cmd-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Comandos GoalPressure"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <div className="gp-cmd-palette__input-wrap">
          <Search className="h-4 w-4 shrink-0 text-[var(--gp-cmd-muted)]" />
          <input
            type="text"
            className="gp-cmd-palette__input"
            placeholder="Buscar jogos, ligas, GPI, comandos…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            autoComplete="off"
            spellCheck={false}
          />
          {loading && <span className="gp-cmd-palette__loading">···</span>}
        </div>

        <QuickActions />

        <CommandResults
          items={results}
          activeIndex={activeIndex}
          onActiveIndex={setActiveIndex}
          onSelect={execute}
        />

        <CommandShortcuts />
      </div>
    </div>,
    document.body
  );
}
