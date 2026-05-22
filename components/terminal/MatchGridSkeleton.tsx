"use client";

export default function MatchGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="gp-ops-grid-v2 gp-skeleton-grid" aria-busy="true" aria-label="Carregando jogos">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="gp-skeleton-card">
          <div className="gp-skeleton-line gp-skeleton-line--sm" />
          <div className="gp-skeleton-hero">
            <div className="gp-skeleton-crest" />
            <div className="gp-skeleton-score" />
            <div className="gp-skeleton-crest" />
          </div>
          <div className="gp-skeleton-line gp-skeleton-line--md" />
          <div className="gp-skeleton-line gp-skeleton-line--lg" />
        </div>
      ))}
    </div>
  );
}
