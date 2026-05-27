"use client";

import { X } from "lucide-react";
import type { EnrichedLiveMatch } from "@/hooks/useLiveMatchCenter";
import type { MatchTabId } from "./LiveMatchTabs";
import type { TimelineWindow } from "@/lib/terminal/sportsDisplay";
import MatchPanelCard from "./MatchPanelCard";
import TerminalMatchDetail from "./TerminalMatchDetail";
import type { MatchContextResult } from "@/components/terminal/intelligence/ContextEngine";

export default function MatchDetailModal({
  match,
  activeTab,
  onTabChange,
  timelineWindow,
  onTimelineWindowChange,
  isFavorite,
  onToggleFavorite,
  onClose,
  contextView,
}: {
  match: EnrichedLiveMatch;
  activeTab: MatchTabId;
  onTabChange: (tab: MatchTabId) => void;
  timelineWindow: TimelineWindow;
  onTimelineWindowChange: (w: TimelineWindow) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  contextView: MatchContextResult;
}) {
  if (match.isFinished || match.isPreMatch) {
    return (
      <TerminalMatchDetail
        match={match}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        onClose={onClose}
      />
    );
  }

  return (
    <div className="gp-sports-modal" role="dialog" aria-modal="true" aria-label="Detalhe do jogo">
      <button
        type="button"
        className="gp-sports-modal__backdrop"
        aria-label="Fechar detalhe"
        onClick={onClose}
      />
      <div className="gp-sports-modal__panel">
        <button
          type="button"
          className="gp-sports-modal__close"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X className="h-5 w-5" />
        </button>
        <MatchPanelCard
          match={match}
          activeTab={activeTab}
          onTabChange={onTabChange}
          timelineWindow={timelineWindow}
          onTimelineWindowChange={onTimelineWindowChange}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          onExpand={onClose}
          expandLabel="Recolher"
          contextView={contextView}
        />
      </div>
    </div>
  );
}
