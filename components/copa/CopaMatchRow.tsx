import Link from "next/link";
import type { CopaMatch } from "@/lib/copa/types";

export default function CopaMatchRow({ match }: { match: CopaMatch }) {
  const score =
    match.homeScore != null && match.awayScore != null
      ? `${match.homeScore} – ${match.awayScore}`
      : match.kickoffLabel;

  return (
    <article className="gp-copa-match">
      <div className="gp-copa-match__team">
        <span>{match.home.shortCode ?? match.home.name}</span>
      </div>
      <div className="gp-copa-match__score">{score}</div>
      <div className="gp-copa-match__team gp-copa-match__team--away">
        <span>{match.away.shortCode ?? match.away.name}</span>
      </div>
      <div className="gp-copa-match__meta">
        {match.isLive ? (
          <span className="gp-copa-badge gp-copa-badge--live">
            Ao vivo {match.minute != null ? `· ${match.minute}'` : ""}
          </span>
        ) : null}
        {match.group ? <span>Grupo {match.group}</span> : null}
        {match.venue ? <span>{match.venue}</span> : null}
        {match.stage ? <span>{match.stage}</span> : null}
        <Link href={`/live/${match.matchId}`} className="gp-copa-btn" style={{ marginLeft: "auto" }}>
          Terminal
        </Link>
      </div>
    </article>
  );
}
