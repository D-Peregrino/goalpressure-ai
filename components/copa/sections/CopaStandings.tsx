import type { CopaStandingRow } from "@/lib/copa/types";

export default function CopaStandings({ rows }: { rows: CopaStandingRow[] }) {
  const byGroup = new Map<string, CopaStandingRow[]>();
  for (const r of rows) {
    const list = byGroup.get(r.group) ?? [];
    list.push(r);
    byGroup.set(r.group, list);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {[...byGroup.entries()].map(([group, groupRows]) => (
        <div key={group} className="gp-copa-card">
          <p className="gp-copa-card__title">Classificação — Grupo {group}</p>
          <table className="gp-copa-table">
            <thead>
              <tr>
                <th>Seleção</th>
                <th>J</th>
                <th>V</th>
                <th>E</th>
                <th>D</th>
                <th>GP</th>
                <th>GC</th>
                <th>SG</th>
                <th>Pts</th>
              </tr>
            </thead>
            <tbody>
              {groupRows.map((r) => (
                <tr key={r.team.id}>
                  <td>{r.team.shortCode ?? r.team.name}</td>
                  <td>{r.played}</td>
                  <td>{r.won}</td>
                  <td>{r.drawn}</td>
                  <td>{r.lost}</td>
                  <td>{r.goalsFor}</td>
                  <td>{r.goalsAgainst}</td>
                  <td>{r.goalDiff}</td>
                  <td><strong>{r.points}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
