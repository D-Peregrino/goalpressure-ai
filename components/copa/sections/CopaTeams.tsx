import type { CopaTeam } from "@/lib/copa/types";

export default function CopaTeams({ teams }: { teams: CopaTeam[] }) {
  return (
    <div className="gp-copa-card">
      <p className="gp-copa-card__title">Seleções</p>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: "0.35rem" }}>
        {teams.map((t) => (
          <li
            key={t.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0.5rem 0",
              borderBottom: "1px solid var(--copa-border)",
              fontSize: "0.88rem",
            }}
          >
            <span>
              <strong>{t.shortCode ?? "—"}</strong> {t.name}
            </span>
            {t.group ? <span style={{ color: "var(--copa-muted)" }}>Grupo {t.group}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
