"use client";

import { useEffect, useRef } from "react";
import type { CommandItem } from "@/lib/command/command.types";
import { groupCommands } from "@/lib/command/commandParser";

export default function CommandResults({
  items,
  activeIndex,
  onActiveIndex,
  onSelect,
}: {
  items: CommandItem[];
  activeIndex: number;
  onActiveIndex: (i: number) => void;
  onSelect: (item: CommandItem) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const grouped = groupCommands(items);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!items.length) {
    return <p className="gp-cmd-empty">Nenhum resultado.</p>;
  }

  let flatIndex = 0;

  return (
    <div ref={listRef} className="gp-cmd-results" role="listbox">
      {[...grouped.entries()].map(([group, groupItems]) => (
        <div key={group} className="gp-cmd-results__group">
          <p className="gp-cmd-results__group-label">{group}</p>
          <ul>
            {groupItems.map((item) => {
              const idx = flatIndex++;
              const active = idx === activeIndex;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    data-index={idx}
                    className={`gp-cmd-result ${active ? "gp-cmd-result--active" : ""}`}
                    onMouseEnter={() => onActiveIndex(idx)}
                    onClick={() => onSelect(item)}
                  >
                    <span className="gp-cmd-result__title">{item.title}</span>
                    {item.subtitle && (
                      <span className="gp-cmd-result__sub">{item.subtitle}</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
