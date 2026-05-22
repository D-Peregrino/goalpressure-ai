"use client";

import Link from "next/link";
import { Bookmark, History } from "lucide-react";
import type { RecentOpportunity } from "@/hooks/useRetentionHistory";

export default function RetentionRail({
  recent,
  watchedCount,
  favoriteCount,
}: {
  recent: RecentOpportunity[];
  watchedCount: number;
  favoriteCount: number;
}) {
  return (
    <section className="gp-retention-rail" aria-label="Continuidade operacional">
      <div className="gp-retention-rail__stats">
        <span className="gp-retention-rail__stat">
          <Bookmark className="h-3.5 w-3.5" aria-hidden />
          {favoriteCount} favorito{favoriteCount !== 1 ? "s" : ""}
        </span>
        <span className="gp-retention-rail__stat">
          <History className="h-3.5 w-3.5" aria-hidden />
          {watchedCount} acompanhado{watchedCount !== 1 ? "s" : ""}
        </span>
      </div>
      {recent.length > 0 && (
        <ul className="gp-retention-rail__recent">
          {recent.slice(0, 4).map((r) => (
            <li key={`${r.fixtureId}-${r.ts}`}>
              <Link
                href={`/match/${encodeURIComponent(r.fixtureId)}`}
                className="gp-retention-rail__link"
              >
                <span className="gp-retention-rail__label gp-clamp-1">{r.label}</span>
                <span className="gp-retention-rail__narrative gp-clamp-1">{r.narrative}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
