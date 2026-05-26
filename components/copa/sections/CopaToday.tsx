import CopaMatchRow from "@/components/copa/CopaMatchRow";
import type { CopaMatch } from "@/lib/copa/types";

export default function CopaToday({ matches }: { matches: CopaMatch[] }) {
  return (
    <div className="gp-copa-card">
      <p className="gp-copa-card__title">Jogos de hoje</p>
      {matches.length === 0 ? (
        <p style={{ color: "var(--copa-muted)", margin: 0 }}>Nenhum jogo programado para hoje.</p>
      ) : (
        matches.map((m) => <CopaMatchRow key={m.fixtureId} match={m} />)
      )}
    </div>
  );
}
