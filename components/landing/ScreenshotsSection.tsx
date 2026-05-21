"use client";

import { TerminalMock } from "@/components/ui/terminal";

const SHOTS = [
  {
    title: "Match Card Pro",
    desc: "Cada jogo como ativo: momentum, heatmap, edge flash e odds tape.",
  },
  {
    title: "Desk radar",
    desc: "Chaos agregado, steam moves e EV+ no painel lateral.",
  },
  {
    title: "Calibração live",
    desc: "Fair odd e distorção vs pressão proprietária em tempo real.",
  },
] as const;

export default function ScreenshotsSection() {
  return (
    <section id="screenshots" className="gp-landing-section gp-landing-section--muted">
      <div className="gp-landing-container">
        <p className="gp-landing-eyebrow text-center">Screenshots</p>
        <h2 className="gp-landing-section__title text-center">Terminal UI V2</h2>
        <div className="gp-screenshots-layout">
          <div className="gp-screenshots-preview">
            <TerminalMock />
          </div>
          <ul className="gp-screenshots-copy">
            {SHOTS.map((s) => (
              <li key={s.title} className="gp-screenshots-copy__item">
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
