"use client";

/** Camada visual do terminal — sem lógica de negócio. */
export default function TerminalPremiumAmbient() {
  return (
    <div className="gp-terminal-ambient gp-terminal-ambient--broadcast" aria-hidden>
      <div className="gp-terminal-ambient__orb gp-terminal-ambient__orb--red" />
      <div className="gp-terminal-ambient__orb gp-terminal-ambient__orb--blue" />
      <div className="gp-terminal-ambient__veil" />
    </div>
  );
}
