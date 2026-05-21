import Link from "next/link";
import { BRAND } from "@/lib/design/brand";

export default function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="gp-auth-page">
      <div className="gp-auth-page__ambient" aria-hidden />
      <header className="gp-auth-page__header">
        <Link href="/" className="gp-auth-page__brand">
          Goal<span className="gp-accent">Pressure</span> AI
        </Link>
        <Link href="/terminal" className="gp-auth-page__link">
          Terminal
        </Link>
      </header>
      <main className="gp-auth-page__main">
        <div className="gp-auth-card">
          <p className="gp-landing-eyebrow">{BRAND.domain}</p>
          <h1 className="gp-auth-card__title">{title}</h1>
          {subtitle && <p className="gp-auth-card__sub">{subtitle}</p>}
          {children}
        </div>
      </main>
    </div>
  );
}
