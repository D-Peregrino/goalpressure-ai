"use client";

import {
  Activity,
  BarChart3,
  Brain,
  LineChart,
  Radar,
  Shield,
  Zap,
} from "lucide-react";
import { DETECTIONS } from "@/lib/design/brand";

const FEATURES = [
  {
    icon: Activity,
    title: "Pressure Engine",
    desc: "Índice de pressão ofensiva por minuto com trend e dominance.",
  },
  {
    icon: LineChart,
    title: "Market Calibration",
    desc: "Odds bet365 reais, fair odd, edge %, steam e drift.",
  },
  {
    icon: Radar,
    title: "Chaos Radar",
    desc: "Microeventos, sequências perigosas e bursts de caos.",
  },
  {
    icon: BarChart3,
    title: "xG & tape ao vivo",
    desc: "xG, SOT, dangerous attacks, corners e posse em tempo real.",
  },
  {
    icon: Brain,
    title: "Meta Consensus",
    desc: "Consenso entre engines e execution grade institucional.",
  },
  {
    icon: Shield,
    title: "Desk seguro",
    desc: "Runtime resiliente, cache agressivo e polling otimizado.",
  },
  {
    icon: Zap,
    title: "EV+ & alertas",
    desc: "Sinais com EV mínimo e integração Telegram (Pro).",
  },
] as const;

export default function FeaturesSection() {
  return (
    <section id="features" className="gp-landing-section">
      <div className="gp-landing-container">
        <p className="gp-landing-eyebrow text-center">Produto</p>
        <h2 className="gp-landing-section__title text-center">
          Experiência vendável para operação live
        </h2>
        <p className="gp-landing-section__sub text-center">
          Sem novos engines — o valor está na consolidação premium do runtime que você já tem.
        </p>
        <div className="gp-features-grid">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <article key={title} className="gp-feature-card">
              <Icon className="gp-feature-card__icon" aria-hidden />
              <h3 className="gp-feature-card__title">{title}</h3>
              <p className="gp-feature-card__desc">{desc}</p>
            </article>
          ))}
        </div>
        <ul className="gp-detections-row">
          {DETECTIONS.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
