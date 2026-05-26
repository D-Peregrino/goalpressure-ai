/** Mockup estático do terminal — preview visual na landing (sem API). */

function PressureCurve() {
  return (
    <svg viewBox="0 0 280 72" fill="none" aria-hidden>
      <defs>
        <linearGradient id="gpl-curve-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255, 43, 43, 0.35)" />
          <stop offset="100%" stopColor="rgba(255, 43, 43, 0)" />
        </linearGradient>
        <linearGradient id="gpl-curve-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff2b2b" />
          <stop offset="100%" stopColor="#ff6b4a" />
        </linearGradient>
      </defs>
      <path
        d="M0 58 C40 52, 55 38, 80 42 S120 18, 160 28 S220 8, 280 22 L280 72 L0 72 Z"
        fill="url(#gpl-curve-fill)"
      />
      <path
        d="M0 58 C40 52, 55 38, 80 42 S120 18, 160 28 S220 8, 280 22"
        stroke="url(#gpl-curve-stroke)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

const SIDE_MATCHES = [
  { home: "Arsenal", away: "Chelsea", score: "1–0", heat: 62, hot: false },
  { home: "Barcelona", away: "Atlético", score: "2–1", heat: 84, hot: true },
  { home: "Inter", away: "Milan", score: "0–0", heat: 41, hot: false },
];

export default function TerminalMockup() {
  return (
    <div className="gpl-mock" aria-label="Prévia da central ao vivo GoalPressure">
      <div className="gpl-mock__chrome">
        <div className="gpl-mock__dots" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <span className="gpl-mock__title">Central ao vivo</span>
        <span className="gpl-mock__live">
          <span className="gpl-mock__live-dot" aria-hidden />
          Ao vivo
        </span>
      </div>
      <div className="gpl-mock__body">
        <div>
          <div className="gpl-mock__hero-card">
            <div className="gpl-mock__match-row">
              <div className="gpl-mock__team">
                <span className="gpl-mock__crest" aria-hidden />
                <span>Liverpool</span>
              </div>
              <span className="gpl-mock__score">2 – 1</span>
              <div className="gpl-mock__team" style={{ flexDirection: "row-reverse" }}>
                <span className="gpl-mock__crest" aria-hidden />
                <span>Man City</span>
              </div>
            </div>
            <p className="gpl-mock__minute">67&apos; · Alta pressão ofensiva</p>
            <div className="gpl-mock__gpi">
              <div className="gpl-mock__gpi-label">
                <span>GoalPressure Index</span>
                <span>78</span>
              </div>
              <div className="gpl-mock__gpi-bar">
                <div className="gpl-mock__gpi-fill" />
              </div>
            </div>
          </div>
          <div className="gpl-mock__chart" style={{ marginTop: "0.75rem" }}>
            <PressureCurve />
          </div>
        </div>
        <div className="gpl-mock__list">
          {SIDE_MATCHES.map((m) => (
            <div
              key={`${m.home}-${m.away}`}
              className={`gpl-mock__list-item${m.hot ? " gpl-mock__list-item--hot" : ""}`}
            >
              <span>
                {m.home} × {m.away}
              </span>
              <span>
                {m.score} · <span className="gpl-mock__heat">{m.heat}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
