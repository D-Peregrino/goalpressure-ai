import Link from "next/link";
import { COPA_BRAND } from "@/lib/copa/config";
import CopaIntegrationsStrip from "@/components/copa/CopaIntegrationsStrip";

export default function CopaShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="gp-copa">
      <div className="gp-copa__ambient" aria-hidden />
      <div className="gp-copa__inner">
        <header className="gp-copa-header">
          <div>
            <Link href="/" className="gp-copa-header__brand">
              <p className="gp-copa-header__eyebrow">FIFA 2026 · SportMonks</p>
              <h1 className="gp-copa-header__title">
                Goal<span>Pressure</span> Copa 2026
              </h1>
            </Link>
            <p className="gp-copa-header__sub">{COPA_BRAND.subtitle}</p>
          </div>
          <div className="gp-copa-header__actions">
            <Link href="/terminal" className="gp-copa-btn">
              Terminal
            </Link>
            <Link href="/precos" className="gp-copa-btn gp-copa-btn--primary">
              Upgrade
            </Link>
          </div>
        </header>
        {children}
        <CopaIntegrationsStrip />
      </div>
    </div>
  );
}
