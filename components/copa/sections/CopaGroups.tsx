import type { CopaGroupRow } from "@/lib/copa/types";

export default function CopaGroups({ groups }: { groups: CopaGroupRow[] }) {
  return (
    <div className="gp-copa-group-grid">
      {groups.map((g) => (
        <div key={g.group} className="gp-copa-card gp-copa-group-card">
          <h3>Grupo {g.group}</h3>
          <ul>
            {g.teams.map((t) => (
              <li key={t.id}>
                {t.shortCode ? `${t.shortCode} · ` : ""}
                {t.name}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
