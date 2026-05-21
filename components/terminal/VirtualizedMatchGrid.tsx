"use client";

import { useCallback, useEffect, useRef, useState, memo } from "react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import MatchCardPro from "@/components/terminal/MatchCardPro";

const GRID_ROW_ESTIMATE = 480;
const LIST_ROW_ESTIMATE = 200;
const OVERSCAN = 2;
const VIRTUALIZE_THRESHOLD = 10;

function VirtualizedMatchGridInner({
  matches,
  favorites,
  onToggleFavorite,
  viewMode,
  historyRef,
  auditMode = false,
}: {
  matches: EnrichedLiveMatch[];
  favorites: Set<string>;
  onToggleFavorite: (fixtureId: string) => void;
  viewMode: "grid" | "list";
  historyRef: React.MutableRefObject<Map<string, number[]>>;
  auditMode?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ start: 0, end: matches.length });

  const auditExtra = auditMode ? 140 : 0;
  const rowHeight =
    (viewMode === "list" ? LIST_ROW_ESTIMATE : GRID_ROW_ESTIMATE) + auditExtra;
  const useVirtual = matches.length >= VIRTUALIZE_THRESHOLD;

  const updateRange = useCallback(() => {
    const el = containerRef.current;
    if (!el || !useVirtual) {
      setRange({ start: 0, end: matches.length });
      return;
    }
    const scrollTop = el.scrollTop;
    const viewH = el.clientHeight || 600;
    const start = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
    const visible = Math.ceil(viewH / rowHeight) + OVERSCAN * 2;
    const end = Math.min(matches.length, start + visible + 4);
    setRange({ start, end });
  }, [matches.length, rowHeight, useVirtual]);

  useEffect(() => {
    updateRange();
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateRange, { passive: true });
    window.addEventListener("resize", updateRange);
    return () => {
      el.removeEventListener("scroll", updateRange);
      window.removeEventListener("resize", updateRange);
    };
  }, [updateRange]);

  useEffect(() => {
    updateRange();
  }, [matches.length, viewMode, updateRange]);

  const visible = useVirtual ? matches.slice(range.start, range.end) : matches;
  const topPad = useVirtual ? range.start * rowHeight : 0;
  const bottomPad = useVirtual
    ? Math.max(0, (matches.length - range.end) * rowHeight)
    : 0;

  const gridClass =
    viewMode === "list" ? "gp-ops-grid-v2 gp-ops-grid-v2--list" : "gp-ops-grid-v2";

  return (
    <div
      ref={containerRef}
      className={`gp-virtual-scroll ${useVirtual ? "gp-virtual-scroll--on" : ""}`}
    >
      <div style={{ height: topPad }} aria-hidden />
      <div className={gridClass}>
        {visible.map((m) => (
          <div
            key={m.fixtureId}
            className="gp-virtual-item"
            style={{ contentVisibility: "auto", containIntrinsicSize: `${rowHeight}px` }}
          >
            <MatchCardPro
              match={m}
              layout={viewMode}
              isFavorite={favorites.has(m.fixtureId)}
              onToggleFavorite={() => onToggleFavorite(m.fixtureId)}
              pressureHistory={historyRef.current.get(m.fixtureId)}
              auditMode={auditMode}
            />
          </div>
        ))}
      </div>
      <div style={{ height: bottomPad }} aria-hidden />
    </div>
  );
}

export default memo(VirtualizedMatchGridInner);
