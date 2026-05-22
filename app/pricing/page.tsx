import Link from "next/link";
import PlanComparison from "@/components/subscription/PlanComparison";
import TrustStrip from "@/components/commercial/TrustStrip";
import SocialProofStrip from "@/components/commercial/SocialProofStrip";

export const metadata = {
  title: "Planos — GoalPressure",
  description: "Free, Pro e Elite — central esportiva ao vivo.",
};

export default function PricingPage() {
  return (
    <div className="gp-upgrade-page gp-pricing-page">
      <div className="gp-upgrade-page__inner">
        <Link href="/" className="gp-upgrade-page__back">
          ← Início
        </Link>
        <header className="gp-upgrade-page__header">
          <p className="gp-landing-eyebrow">Planos</p>
          <h1 className="gp-upgrade-page__title">Escolha como operar ao vivo</h1>
          <p className="gp-upgrade-page__sub">
            Comece grátis. Escale para Pro ou Elite quando precisar de leitura completa.
          </p>
        </header>
        <PlanComparison />
        <SocialProofStrip />
        <TrustStrip />
      </div>
    </div>
  );
}
