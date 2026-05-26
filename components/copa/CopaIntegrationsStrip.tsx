import Link from "next/link";

const LINKS = [
  { href: "/terminal", label: "Terminal" },
  { href: "/workspace", label: "Workspace" },
  { href: "/replay", label: "Replay" },
  { href: "/ops", label: "OPS Center" },
  { href: "/precos", label: "Planos" },
] as const;

export default function CopaIntegrationsStrip() {
  return (
    <div className="gp-copa-integrations">
      <span className="gp-copa-card__title" style={{ margin: 0, alignSelf: "center" }}>
        Integrações
      </span>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className="gp-copa-btn">
          {l.label}
        </Link>
      ))}
    </div>
  );
}
