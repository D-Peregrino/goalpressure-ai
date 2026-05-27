"use client";

import TerminalMatchDetail from "./TerminalMatchDetail";

export default function MatchDetailModal({
  match,
  isFavorite,
  onToggleFavorite,
  onClose,
}: {
  match: import("@/hooks/useLiveMatchCenter").EnrichedLiveMatch;
  activeTab?: import("./LiveMatchTabs").MatchTabId;
  onTabChange?: (tab: import("./LiveMatchTabs").MatchTabId) => void;
  timelineWindow?: import("@/lib/terminal/sportsDisplay").TimelineWindow;
  onTimelineWindowChange?: (w: import("@/lib/terminal/sportsDisplay").TimelineWindow) => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onClose: () => void;
  contextView?: import("@/components/terminal/intelligence/ContextEngine").MatchContextResult;
}) {
  return (
    <TerminalMatchDetail
      match={match}
      isFavorite={isFavorite}
      onToggleFavorite={onToggleFavorite}
      onClose={onClose}
    />
  );
}
