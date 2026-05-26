"use client";

import {
  BarChart3,
  Bell,
  Gauge,
  LineChart,
  Radio,
  Shield,
} from "lucide-react";
import DiffCardsGrid from "@/components/landing/premium/DiffCardsGrid";
import ScrollReveal from "@/components/landing/premium/ScrollReveal";

const DIFFERENTIALS = [
  {
    icon: Gauge,
    title: "GoalPressure Index",
    desc: "Um índice proprietário que resume intensidade, ritmo e urgência — leitura instantânea, sem ruído.",
  },
  {
    icon: LineChart,
    title: "Curvas ao vivo",
    desc: "Mini charts de pressão com a fluidez de uma mesa de trading esportivo institucional.",
  },
  {
    icon: BarChart3,
    title: "Mercado integrado",
    desc: "Contexto de odds junto ao que acontece em campo — uma narrativa, um lugar.",
  },
  {
    icon: Bell,
    title: "Alertas inteligentes",
    desc: "Saiba quando o confronto esquenta, com linguagem clara e priorização automática.",
  },
  {
    icon: Radio,
    title: "Central unificada",
    desc: "Hero, ranking de calor e lista lateral — sua atenção guiada como em broadcast premium.",
  },
  {
    icon: Shield,
    title: "Transparência institucional",
    desc: "Confiança por partida e comunicação honesta sobre limites — produto sério, sem hype.",
  },
];

export default function DiffSection() {
  return (
    <section className="gpl-section">
      <div className="gpl-wrap">
        <ScrollReveal className="gpl-section__head gpl-section__head--center">
          <p className="gpl-eyebrow">Diferenciais</p>
          <h2 className="gpl-section__title">Software institucional para o ao vivo</h2>
          <p className="gpl-section__sub">
            Construído para parecer — e operar — como um SaaS esportivo de escala global.
          </p>
        </ScrollReveal>
        <DiffCardsGrid items={DIFFERENTIALS} />
      </div>
    </section>
  );
}
