import Link from "next/link";
import { Check } from "lucide-react";
import {
  PLANOS,
  formatarPreco,
  PLANO_FUNDADOR_CENTAVOS,
  CUPOM_BARBOSATIPS75,
} from "@/lib/subscription/plans";

export default function PlansFinale() {
  const fundador = PLANOS.find((p) => p.id === "fundador");

  return (
    <section id="planos" className="gpl-section gpl-section--alt">
      <div className="gpl-wrap">
        <div className="gpl-section__head gpl-section__head--center">
          <p className="gpl-eyebrow">Planos</p>
          <h2 className="gpl-section__title">Escolha como operar ao vivo</h2>
          <p className="gpl-section__sub">
            Comece sem custo. Evolua para a central completa quando estiver pronto para decidir com
            mais profundidade.
          </p>
        </div>

        <div className="gpl-plans-grid gpl-plans-grid--4">
          {PLANOS.map((plano) => {
            const featured = plano.destaque === true;
            const indisponivel = !plano.disponivel;
            const preco =
              plano.id === "fundador"
                ? formatarPreco(PLANO_FUNDADOR_CENTAVOS)
                : formatarPreco(plano.precoMensalCentavos);

            let href = "/terminal";
            if (plano.id === "gratuito") href = "/cadastro";
            if (plano.id === "fundador") href = `/cadastro?cupom=${CUPOM_BARBOSATIPS75}`;
            if (plano.id === "profissional") href = "/precos";

            return (
              <article
                key={plano.id}
                className={`gpl-plan-card${featured ? " gpl-plan-card--featured" : ""}`}
              >
                {plano.badge ? <span className="gpl-plan-card__badge">{plano.badge}</span> : null}
                <p className="gpl-eyebrow" style={{ marginTop: plano.badge ? "0.5rem" : 0 }}>
                  {plano.nome}
                </p>
                <p className="gpl-plan-card__price">{preco}</p>
                {plano.id === "fundador" ? (
                  <p className="gpl-plan-card__desc" style={{ color: "var(--gpl-accent)" }}>
                    Cupom BarbosaTips75: 75% off no checkout
                  </p>
                ) : (
                  <p className="gpl-plan-card__desc">{plano.descricao}</p>
                )}
                <ul>
                  {plano.recursos.slice(0, 5).map((r) => (
                    <li key={r}>
                      <Check className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--gpl-accent)" }} />
                      {r}
                    </li>
                  ))}
                </ul>
                {indisponivel ? (
                  <span className="gpl-btn gpl-btn--secondary gpl-plan-card__cta" style={{ opacity: 0.5 }}>
                    Em breve
                  </span>
                ) : (
                  <Link
                    href={href}
                    className={`gpl-btn ${featured ? "gpl-btn--primary" : "gpl-btn--secondary"} gpl-plan-card__cta`}
                  >
                    {plano.id === "gratuito" ? "Criar conta grátis" : plano.id === "fundador" ? "Garantir vaga fundador" : "Ver detalhes"}
                  </Link>
                )}
              </article>
            );
          })}
        </div>

        {fundador ? (
          <p className="gpl-footer__legal" style={{ marginTop: "2rem" }}>
            O Plano Fundador é oferta de lançamento com vagas limitadas. Profissional e Elite serão
            liberados em fases posteriores. Não há garantia de lucro — a plataforma entrega leitura
            esportiva e contexto de mercado.
          </p>
        ) : null}
      </div>
    </section>
  );
}
