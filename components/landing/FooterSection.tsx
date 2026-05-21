import { BRAND } from "@/lib/design/brand";

export default function FooterSection() {
  return (
    <footer className="gp-landing-footer">
      <p>
        {BRAND.name} · {BRAND.domain} · {new Date().getFullYear()}
      </p>
      <p className="gp-landing-footer__sub">
        Terminal quantitativo · Dados SportMonks · Engines proprietárias
      </p>
    </footer>
  );
}
