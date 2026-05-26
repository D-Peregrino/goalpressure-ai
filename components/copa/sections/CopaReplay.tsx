import Link from "next/link";
import CopaPremiumGate from "@/components/copa/CopaPremiumGate";

export default function CopaReplaySection() {
  const preview = (
    <div className="gp-copa-card" style={{ opacity: 0.55 }}>
      <p className="gp-copa-card__title">Replay da Copa</p>
      <p style={{ margin: 0 }}>Playback minuto a minuto com GPI histórico.</p>
    </div>
  );

  return (
    <CopaPremiumGate feature="copa_replay" preview={preview}>
      <div className="gp-copa-card">
        <p className="gp-copa-card__title">Replay da Copa</p>
        <p style={{ fontSize: "0.88rem", color: "var(--copa-muted)", margin: "0 0 1rem" }}>
          Reproduza partidas da Copa com evolução de pressão, GPI, consenso e alertas no Replay
          Engine.
        </p>
        <Link href="/replay" className="gp-copa-btn gp-copa-btn--primary">
          Abrir Replay Engine
        </Link>
      </div>
    </CopaPremiumGate>
  );
}
