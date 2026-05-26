import Link from "next/link";
import CopaPremiumGate from "@/components/copa/CopaPremiumGate";

export default function CopaOpsSection() {
  const preview = (
    <div className="gp-copa-card" style={{ opacity: 0.55 }}>
      <p className="gp-copa-card__title">OPS Center — Copa</p>
    </div>
  );

  return (
    <CopaPremiumGate feature="copa_ops" preview={preview}>
      <div className="gp-copa-card">
        <p className="gp-copa-card__title">OPS Center — Copa</p>
        <p style={{ fontSize: "0.88rem", color: "var(--copa-muted)", margin: "0 0 1rem" }}>
          Visão operacional agregada para operadores institucionais — disponível no plano Elite.
        </p>
        <Link href="/ops" className="gp-copa-btn gp-copa-btn--primary">
          Abrir OPS Center
        </Link>
      </div>
    </CopaPremiumGate>
  );
}
