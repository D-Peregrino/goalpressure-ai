import Link from "next/link";
import { ArrowRight, Trophy } from "lucide-react";
import ScrollReveal from "@/components/landing/premium/ScrollReveal";
import { CUPOM_BARBOSATIPS75 } from "@/lib/subscription/plans";

export default function CopaAcquisitionSection() {
  return (
    <section id="copa-2026" className="gpl-section gpl-copa-acq">
      <div className="gpl-wrap">
        <ScrollReveal className="gpl-copa-acq__inner">
          <div className="gpl-copa-acq__copy">
            <p className="gpl-eyebrow">
              <Trophy className="inline h-3.5 w-3.5 align-middle" aria-hidden /> Isca comercial ·
              Copa 2026
            </p>
            <h2 className="gpl-section__title">GoalPressure Copa 2026</h2>
            <p className="gpl-section__sub">
              Porta de entrada para acompanhar a Copa com calendário, grupos, classificação e
              leitura ao vivo — sem misturar com o terminal escuro. Premium desbloqueia GPI,
              alertas Telegram, replay e OPS.
            </p>
            <p className="gpl-copa-acq__barbosa">
              Projeto conectado ao ecossistema <strong>BarbosaTips</strong>.
            </p>
          </div>
          <div className="gpl-copa-acq__ctas">
            <Link href="/copa" className="gpl-btn gpl-btn--primary gpl-btn--lg">
              Ver jogos da Copa
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href="/copa#copa-leads" className="gpl-btn gpl-btn--secondary gpl-btn--lg">
              Ativar alertas da Copa
            </Link>
            <Link
              href={`/cadastro?cupom=${CUPOM_BARBOSATIPS75}&origem=copa-home`}
              className="gpl-btn gpl-btn--ghost gpl-btn--lg"
            >
              Entrar no plano fundador
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
