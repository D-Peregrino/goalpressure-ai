"use client";

import Link from "next/link";
import TeamBadge from "@/components/matches/TeamBadge";
import type { OpsMatchSlot, OpsMultiViewCount } from "@/lib/ops/opsCenter.types";
import { pickTopMatches } from "@/lib/ops/opsPriority";

export default function OpsGrid({
  matches,
  viewCount,
  selectedFixtureId,
  onSelect,
}: {
  matches: OpsMatchSlot[];
  viewCount: OpsMultiViewCount;
  selectedFixtureId: string | null;
  onSelect: (fixtureId: string) => void;
}) {
  const visible = pickTopMatches(matches, viewCount);

  return (
    <div className={`gp-ops-grid gp-ops-grid--${viewCount}`}>
      {visible.map((m) => (
        <article
          key={m.fixtureId}
          className={`gp-ops-tile ${selectedFixtureId === m.fixtureId ? "gp-ops-tile--active" : ""}`}
          onClick={() => onSelect(m.fixtureId)}
          onKeyDown={(e) => e.key === "Enter" && onSelect(m.fixtureId)}
          role="button"
          tabIndex={0}
        >
          <header className="gp-ops-tile__head">
            <span>{m.league}</span>
            {m.isLive && <span className="gp-ops-tile__live">LIVE</span>}
            <span className="gp-ops-tile__min">{m.minute != null ? `${m.minute}'` : "—"}</span>
          </header>
          <div className="gp-ops-tile__teams">
            <div className="gp-ops-tile__side">
              <TeamBadge teamName={m.homeTeam} logoUrl={m.homeLogoUrl} size="sm" />
              <span>{m.homeTeam}</span>
            </div>
            <div className="gp-ops-tile__score">
              {m.homeScore ?? "—"} – {m.awayScore ?? "—"}
            </div>
            <div className="gp-ops-tile__side gp-ops-tile__side--away">
              <span>{m.awayTeam}</span>
              <TeamBadge teamName={m.awayTeam} logoUrl={m.awayLogoUrl} size="sm" />
            </div>
          </div>
          <div className="gp-ops-tile__metrics">
            <Metric label="Pressão" value={m.pressureScore} />
            <Metric label="GPI" value={m.gpiScore ?? "—"} />
            <Metric label="Consenso" value={m.consensusScore ?? "—"} />
            <Metric label="Prior." value={m.priorityScore} highlight />
          </div>
          {(m.oddsLag || m.ignoredByMarket) && (
            <footer className="gp-ops-tile__flags">
              {m.oddsLag && <span>Odds atrasadas</span>}
              {m.ignoredByMarket && <span>Mercado ignorado</span>}
            </footer>
          )}
          <Link
            href={`/match/${encodeURIComponent(m.fixtureId)}`}
            className="gp-ops-tile__link"
            onClick={(e) => e.stopPropagation()}
          >
            Abrir partida
          </Link>
        </article>
      ))}
    </div>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div className={`gp-ops-tile__metric ${highlight ? "gp-ops-tile__metric--hi" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
