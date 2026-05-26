import type { CopaDataset } from "@/lib/copa/types";

export default function CopaOverview({ data }: { data: CopaDataset }) {
  const { overview } = data;
  return (
    <section className="gp-copa-hero">
      <div className="gp-copa-card">
        <p className="gp-copa-card__title">Visão geral</p>
        <p style={{ margin: "0 0 1rem", fontSize: "1.05rem", fontWeight: 600 }}>
          {overview.headline}
        </p>
        <div className="gp-copa-stat-grid">
          <div className="gp-copa-stat">
            <div className="gp-copa-stat__value">{overview.liveNow}</div>
            <div className="gp-copa-stat__label">Ao vivo</div>
          </div>
          <div className="gp-copa-stat">
            <div className="gp-copa-stat__value">{overview.todayCount}</div>
            <div className="gp-copa-stat__label">Hoje</div>
          </div>
          <div className="gp-copa-stat">
            <div className="gp-copa-stat__value">{overview.teamsCount}</div>
            <div className="gp-copa-stat__label">Seleções</div>
          </div>
          <div className="gp-copa-stat">
            <div className="gp-copa-stat__value">{overview.totalMatches}</div>
            <div className="gp-copa-stat__label">Jogos</div>
          </div>
        </div>
        <p style={{ margin: "1rem 0 0", fontSize: "0.75rem", color: "var(--copa-muted)" }}>
          Fonte: {data.source} · Liga {data.leagueId} · Atualizado{" "}
          {new Date(data.generatedAt).toLocaleString("pt-BR")}
        </p>
      </div>
      <div className="gp-copa-card">
        <p className="gp-copa-card__title">Modelo freemium</p>
        <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem" }}>
          <span className="gp-copa-badge gp-copa-badge--free">Grátis</span>{" "}
          calendário, grupos, tabela e jogos.
        </p>
        <p style={{ margin: 0, fontSize: "0.88rem" }}>
          <span className="gp-copa-badge gp-copa-badge--premium">Premium</span>{" "}
          GPI, leitura contextual, alertas Telegram, replay e OPS.
        </p>
      </div>
    </section>
  );
}
