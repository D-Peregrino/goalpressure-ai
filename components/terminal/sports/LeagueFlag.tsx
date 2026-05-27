"use client";

import { Flag } from "lucide-react";

/** Bandeira/indicador de competição — sempre visível no card. */
export default function LeagueFlag({ league }: { league: string }) {
  const label = league.trim() || "Competição";
  return (
    <span className="gp-sports__league-flag" title={label} aria-hidden>
      <Flag className="h-3.5 w-3.5 shrink-0 text-[#64748B]" strokeWidth={2} />
    </span>
  );
}
