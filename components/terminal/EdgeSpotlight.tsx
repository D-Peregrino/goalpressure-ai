"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { TERMINAL_COPY, TOOLTIPS } from "@/lib/ux/sportsLanguage";
import SportsTooltip from "@/components/ui/SportsTooltip";

function EdgeSpotlightInner({ matches }: { matches: EnrichedLiveMatch[] }) {
  const { can } = useSubscription();

  const top = useMemo(
    () =>
      [...matches]
        .filter((m) => (m.edgePercent ?? 0) > 0)
        .sort((a, b) => (b.edgePercent ?? 0) - (a.edgePercent ?? 0))
        .slice(0, 4),
    [matches]
  );

  if (!can("edge_full")) {
    return (
      <aside className="gp-edge-spotlight gp-edge-spotlight--locked gp-edge-spotlight--sport">
        <SportsTooltip label={TERMINAL_COPY.edgeTitle} tip={TOOLTIPS.vantagem} />
        <p className="text-xs text-[var(--muted)] mt-2">Plano Pro mostra vantagem e odd justa.</p>
      </aside>
    );
  }

  return (
    <aside className="gp-edge-spotlight gp-edge-spotlight--sport gp-edge-spotlight--premium">
      <SportsTooltip label={TERMINAL_COPY.edgeTitle} tip={TOOLTIPS.vantagem} />
      <ul className="gp-edge-spotlight__list">
        {top.length === 0 && (
          <li className="text-xs text-[var(--muted)]">Nenhuma oportunidade clara agora.</li>
        )}
        {top.map((m) => (
          <li key={m.fixtureId}>
            <Link
              href={`/match/${encodeURIComponent(m.fixtureId)}`}
              className="gp-edge-spotlight__row"
            >
              <span className="gp-edge-spotlight__teams">
                {m.homeTeam} x {m.awayTeam}
              </span>
              <span className="gp-edge-spotlight__edge tabular-nums">
                +{(m.edgePercent ?? 0).toFixed(1)}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default memo(EdgeSpotlightInner);
