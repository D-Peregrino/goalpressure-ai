import type { CopaDataset } from "@/lib/copa/types";

export default function CopaStats({ stats }: { stats: CopaDataset["stats"] }) {
  return (
    <div className="gp-copa-card">
      <p className="gp-copa-card__title">Estatísticas</p>
      <div className="gp-copa-stat-grid" style={{ marginBottom: "1rem" }}>
        <div className="gp-copa-stat">
          <div className="gp-copa-stat__value">{stats.totals.goals}</div>
          <div className="gp-copa-stat__label">Gols</div>
        </div>
        <div className="gp-copa-stat">
          <div className="gp-copa-stat__value">{stats.totals.matchesPlayed}</div>
          <div className="gp-copa-stat__label">Jogos</div>
        </div>
        <div className="gp-copa-stat">
          <div className="gp-copa-stat__value">{stats.totals.avgGoals.toFixed(2)}</div>
          <div className="gp-copa-stat__label">Média</div>
        </div>
      </div>
      <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {stats.leaders.map((l) => (
          <li
            key={l.label}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.4rem 0",
              borderBottom: "1px solid var(--copa-border)",
              fontSize: "0.85rem",
            }}
          >
            <span>{l.label}</span>
            <span>
              <strong>{l.value}</strong>
              {l.team ? ` · ${l.team}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
