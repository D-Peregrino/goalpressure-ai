"use client";

import Link from "next/link";
import CopaPremiumGate from "@/components/copa/CopaPremiumGate";
import type { CopaMatch } from "@/lib/copa/types";

export default function CopaContext({ liveMatches }: { liveMatches: CopaMatch[] }) {
  const preview = (
    <p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.6 }}>
      Leitura contextual institucional para cada jogo da Copa — pressão, narrativa e sinais.
    </p>
  );

  return (
    <CopaPremiumGate feature="copa_context" preview={preview}>
      <div className="gp-copa-card">
        <p className="gp-copa-card__title">Leitura contextual</p>
        <p style={{ fontSize: "0.85rem", color: "var(--copa-muted)", margin: "0 0 1rem" }}>
          Abra qualquer jogo ao vivo no terminal para narrativa completa, timeline e engines
          táticos.
        </p>
        {liveMatches.length === 0 ? (
          <p style={{ margin: 0, color: "var(--copa-muted)" }}>Nenhum jogo ao vivo da Copa.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {liveMatches.map((m) => (
              <li key={m.fixtureId} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--copa-border)" }}>
                <Link href={`/live/${m.matchId}`}>
                  {m.home.name} vs {m.away.name}
                </Link>
                <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--copa-muted)" }}>
                  Context Engine · Terminal
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CopaPremiumGate>
  );
}
