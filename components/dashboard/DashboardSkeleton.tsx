"use client";

export default function DashboardSkeleton() {
  return (
    <div className="gp-dash-skeleton" aria-busy="true" aria-label="Carregando sua central">
      <div className="gp-dash-skeleton__hero">
        <div className="gp-dash-skeleton__line gp-dash-skeleton__line--sm" />
        <div className="gp-dash-skeleton__line gp-dash-skeleton__line--lg" />
        <div className="gp-dash-skeleton__line gp-dash-skeleton__line--md" />
      </div>
      <div className="gp-dash-skeleton__quick">
        {[1, 2, 3].map((i) => (
          <div key={i} className="gp-dash-skeleton__card" />
        ))}
      </div>
      <div className="gp-dash-skeleton__grid">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="gp-dash-skeleton__panel" />
        ))}
      </div>
    </div>
  );
}
