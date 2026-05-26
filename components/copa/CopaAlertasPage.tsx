import Link from "next/link";
import CopaShell from "@/components/copa/CopaShell";
import CopaLeadCapture from "@/components/copa/CopaLeadCapture";
import BarbosaTipsBadge from "@/components/copa/BarbosaTipsBadge";
import { CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";

const ALERT_TYPES = [
  {
    title: "Alertas de GPI",
    body: "Quando o Goal Pressure Index entra em zona de aceleração ou ruptura ofensiva em jogos da Copa.",
  },
  {
    title: "Pressão ofensiva",
    body: "Picos de pressão institucional antes da linha de mercado reagir — leitura para decisão rápida.",
  },
  {
    title: "Mercado atrasado",
    body: "Sinais quando o mercado parece atrasado em relação ao ritmo real do jogo.",
  },
  {
    title: "Jogos críticos",
    body: "Destaques de partidas decisivas: empates, viradas e finais de grupo.",
  },
  {
    title: "Telegram",
    body: "Entrega no Telegram com copy institucional, escudos e contexto — integrado ao GoalPressure.",
  },
] as const;

export default function CopaAlertasPage() {
  return (
    <CopaShell>
      <div className="gp-copa-card" style={{ marginBottom: "1rem" }}>
        <p className="gp-copa-card__title">Alertas da Copa 2026</p>
        <p style={{ margin: 0, fontSize: "0.95rem", lineHeight: 1.55 }}>
          O funil comercial da Copa concentra captura de leads, upgrade para Plano Fundador e
          leitura premium ao vivo. Cadastre-se abaixo ou assine para desbloquear tudo.
        </p>
      </div>

      <div className="gp-copa-alertas-grid">
        {ALERT_TYPES.map((a) => (
          <article key={a.title} className="gp-copa-card">
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "var(--copa-green-deep)" }}>
              {a.title}
            </h3>
            <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--copa-muted)" }}>{a.body}</p>
          </article>
        ))}
      </div>

      <BarbosaTipsBadge />

      <div style={{ margin: "1.25rem 0", display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Link href={`/cadastro?cupom=${CUPOM_BARBOSATIPS75}&origem=copa-alertas`} className="gp-copa-btn gp-copa-btn--primary">
          Plano Fundador
        </Link>
        <Link href="/copa" className="gp-copa-btn">
          Voltar para a Copa
        </Link>
        <Link href="/terminal" className="gp-copa-btn">
          Terminal ao vivo
        </Link>
      </div>

      <CopaLeadCapture source="copa-alertas" />
    </CopaShell>
  );
}
