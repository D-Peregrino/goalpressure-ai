"use client";

import type { OperationalDecision } from "@/components/terminal/decision/decisionMapper";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import { cn } from "@/lib/utils";

export default function MatchListRow({
  match,
  decision,
  selected,
  isFavorite,
  onSelect,
  onToggleFavorite,
}: {
  match: EnrichedLiveMatch;
  decision: OperationalDecision;
  selected: boolean;
  isFavorite: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
}) {
  const score =
    match.scoreKnown && match.homeScore != null && match.awayScore != null
      ? `${match.homeScore} × ${match.awayScore}`
      : "—";

  return (
    <button
      type="button"
      className={cn("gp-sports__list-item w-full text-left border-0", selected && "gp-sports__list-item--on")}
      onClick={onSelect}
    >
      <div className="gp-sports__list-main">
        <div className="gp-sports__list-topline">
          <span className={`gp-sports__list-seal gp-sports__list-seal--${decision.sealTone}`}>
            {decision.selo}
          </span>
          <span className="text-xs text-[#6B7280]">{match.league}</span>
        </div>
        <div className="text-sm font-semibold text-[#1B2430]">
          {match.homeTeam} × {match.awayTeam}
        </div>
        <div className="gp-sports__list-situacao">{decision.situacaoAtual}</div>
      </div>
      <div className="gp-sports__list-side">
        <div className="text-sm font-bold tabular-nums">{score}</div>
        <div className="text-xs text-[#22A86B]">{match.minuteLabel}</div>
        <button
          type="button"
          className="gp-sports__list-fav"
          aria-label={isFavorite ? "Remover favorito" : "Adicionar favorito"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
        >
          {isFavorite ? "★" : "☆"}
        </button>
      </div>
    </button>
  );
}
