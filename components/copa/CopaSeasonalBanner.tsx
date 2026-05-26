import Link from "next/link";

type CopaBannerVariant = "landing" | "workspace" | "copa";

export default function CopaSeasonalBanner({ variant = "copa" }: { variant?: CopaBannerVariant }) {
  const className = `gp-copa-seasonal-banner gp-copa-seasonal-banner--${variant}`;

  return (
    <div className={className} role="region" aria-label="Copa do Mundo 2026">
      <p className="gp-copa-seasonal-banner__text">
        <strong>Copa 2026:</strong> acompanhe jogos, grupos, GPI e alertas contextuais em tempo real
      </p>
      <div className="gp-copa-seasonal-banner__actions">
        <Link href="/copa" className="gp-copa-seasonal-banner__cta">
          Abrir Copa
        </Link>
        <Link href="/copa/alertas" className="gp-copa-seasonal-banner__link">
          Alertas
        </Link>
      </div>
    </div>
  );
}
