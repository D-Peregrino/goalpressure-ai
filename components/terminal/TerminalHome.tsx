"use client";

import { useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useLiveMatchCenter } from "@/hooks/useLiveMatchCenter";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useRetentionHistory } from "@/hooks/useRetentionHistory";
import { useSubscription } from "@/contexts/SubscriptionContext";
import MatchFilters from "@/components/matches/MatchFilters";
import TerminalHeader from "@/components/terminal/TerminalHeader";
import TerminalKpiStrip from "@/components/terminal/TerminalKpiStrip";
import LiveOperationsGrid from "@/components/live/LiveOperationsGrid";
import OperationalHero from "@/components/terminal/OperationalHero";
import OperationalAlertFeed from "@/components/terminal/OperationalAlertFeed";
import OperationalAlertFeedMobile from "@/components/terminal/OperationalAlertFeedMobile";
import HeatRanking from "@/components/terminal/HeatRanking";
import OperationalTimeline from "@/components/terminal/OperationalTimeline";
import TerminalPremiumAmbient from "@/components/terminal/TerminalPremiumAmbient";
import { polishStagger } from "@/components/ui/terminal/motion";
import TerminalAuditToggle from "@/components/terminal/TerminalAuditToggle";
import LiveDataSourceStrip from "@/components/live/LiveDataSourceStrip";
import LiveFeedEmptyState from "@/components/live/LiveFeedEmptyState";
import PressureEnginePanel from "@/components/terminal/PressureEnginePanel";
import EVEnginePanel from "@/components/terminal/EVEnginePanel";
import OperationalIntelligencePanel from "@/components/terminal/OperationalIntelligencePanel";
import LearningEnginePanel from "@/components/terminal/LearningEnginePanel";
import LiveCommandCenterPanel from "@/components/terminal/LiveCommandCenterPanel";
import LiveDispatchFeed from "@/components/terminal/LiveDispatchFeed";
import OperatorModePanel from "@/components/terminal/OperatorModePanel";
import DispatchPushSubscriber from "@/components/terminal/DispatchPushSubscriber";
import AutonomousCorePanel from "@/components/terminal/AutonomousCorePanel";
import { useTerminalAuditMode } from "@/hooks/useTerminalAuditMode";
import PaywallGate from "@/components/subscription/PaywallGate";
import UpgradeBanner from "@/components/subscription/UpgradeBanner";
import OnboardingModal from "@/components/onboarding/OnboardingModal";
import SocialProofStrip from "@/components/commercial/SocialProofStrip";
import TrustStrip from "@/components/commercial/TrustStrip";
import RetentionRail from "@/components/commercial/RetentionRail";
import {
  buildOperationalAlerts,
  pickHeroOpportunity,
} from "@/lib/ux/operationalIntelligence";

export default function TerminalHome() {
  const {
    matches,
    allMatches,
    liveSignals,
    kpis,
    filter,
    setFilter,
    search,
    setSearch,
    viewMode,
    setViewMode,
    favorites,
    toggleFavorite,
    feedStatus,
    opsStatus,
    source,
    dataSourceBadge,
    feedError,
    isLoading,
    isEmpty,
    lastUpdated,
    responseTime,
    autonomousSnapshot,
  } = useLiveMatchCenter();
  const { auditMode, setAuditMode } = useTerminalAuditMode();
  const { can, limits } = useSubscription();
  const onboarding = useOnboarding();
  const { recent, watched, recordOpportunity, recordAlert, markWatched } =
    useRetentionHistory();

  const pool = allMatches.length > 0 ? allMatches : matches;

  const hero = useMemo(() => pickHeroOpportunity(pool), [pool]);

  const operationalAlerts = useMemo(() => {
    const base = buildOperationalAlerts(liveSignals, pool);
    const autoAlerts = (autonomousSnapshot?.alerts ?? []).map((a, i) => ({
      id: `auto-${a.type}-${i}`,
      timestamp: autonomousSnapshot?.generatedAt ?? new Date().toISOString(),
      type: "EDGE_ALERT" as const,
      fixtureId: a.fixtureId ?? "",
      matchLabel: a.fixtureId ? `Fixture ${a.fixtureId}` : "Sistema",
      headline: a.headline,
      narrative: a.narrative,
      momentLevel: "warm" as const,
      edgePercent: 0,
    }));
    return [...autoAlerts, ...base].slice(0, 48);
  }, [liveSignals, pool, autonomousSnapshot]);

  const alertsPreview = operationalAlerts.slice(0, limits.alertPreview);
  const alertsDisplay = can("advanced_alerts")
    ? operationalAlerts
    : alertsPreview;

  useEffect(() => {
    if (!hero) return;
    const m = hero.match;
    recordOpportunity({
      fixtureId: m.fixtureId,
      label: `${m.homeTeam} x ${m.awayTeam}`,
      narrative: hero.narrative,
    });
    markWatched(m.fixtureId);
  }, [hero?.match.fixtureId, hero?.narrative, recordOpportunity, markWatched]);

  useEffect(() => {
    const top = alertsPreview[0];
    if (!top) return;
    recordAlert({
      id: top.id,
      fixtureId: top.fixtureId,
      label: top.matchLabel,
      message: top.headline,
    });
  }, [alertsPreview[0]?.id, recordAlert]);

  return (
    <motion.div
      variants={polishStagger}
      initial="hidden"
      animate="show"
      className="gp-terminal-v2 gp-terminal-v2--premium gp-terminal-v2--living gp-terminal-v2--flow gp-terminal-v2--polish gp-terminal-v2--commercial gp-terminal-v2--operator"
    >
      <TerminalPremiumAmbient />
      <DispatchPushSubscriber />
      <OnboardingModal
        open={onboarding.open}
        step={onboarding.step}
        onStep={onboarding.setStep}
        onComplete={onboarding.complete}
        onSkip={onboarding.skip}
      />

      <UpgradeBanner />

      <div className="gp-terminal-v2__top-main gp-terminal-v2__top-main--stack">
        <TerminalHeader
          feedStatus={feedStatus}
          opsStatus={opsStatus}
          source={source}
          dataSourceBadge={dataSourceBadge}
          feedError={feedError}
        />
        <PaywallGate
          feature="hero_premium"
          title="Decisão principal do momento"
          preview={<OperationalHero hero={hero} />}
        >
          <OperationalHero hero={hero} />
        </PaywallGate>
      </div>

      <div className="gp-terminal-v2__top-bar">
        <PaywallGate
          feature="advanced_alerts"
          compact
          preview={
            <OperationalAlertFeedMobile alerts={operationalAlerts} />
          }
        >
          <OperationalAlertFeedMobile alerts={alertsDisplay} />
        </PaywallGate>
        <PaywallGate
          feature="advanced_alerts"
          preview={
            <OperationalAlertFeed
              alerts={operationalAlerts}
              className="gp-terminal-v2__signal-feed--desktop hidden lg:flex"
            />
          }
        >
          <OperationalAlertFeed
            alerts={alertsDisplay}
            className="gp-terminal-v2__signal-feed--desktop hidden lg:flex"
          />
        </PaywallGate>
      </div>

      <RetentionRail
        recent={recent}
        watchedCount={watched.length}
        favoriteCount={favorites.size}
      />

      <TerminalKpiStrip {...kpis} className="gp-kpi-strip--quiet" />

      <LiveDataSourceStrip
        source={source}
        status={feedStatus}
        lastUpdated={lastUpdated}
        matchCount={allMatches.length}
        responseTimeMs={responseTime}
        error={feedError}
      />

      {isEmpty && allMatches.length === 0 && !isLoading && (
        <LiveFeedEmptyState
          source={source}
          matchCount={0}
          lastUpdated={lastUpdated}
          responseTimeMs={responseTime}
          error={feedError}
        />
      )}

      <div className="gp-terminal-v2__desk">
        <aside className="gp-terminal-v2__rail gp-terminal-v2__rail--quiet">
          <PressureEnginePanel
            matches={pool}
            activeSignals={liveSignals.length}
          />
          <EVEnginePanel matches={pool} />
          <OperationalIntelligencePanel matches={pool} />
          <LearningEnginePanel />
          <AutonomousCorePanel />
          <LiveCommandCenterPanel />
          <OperatorModePanel />
          <LiveDispatchFeed className="hidden xl:block" />
          <HeatRanking matches={pool} />
          <PaywallGate
            feature="timeline"
            title="Linha do tempo operacional"
            preview={<OperationalTimeline matches={pool} />}
          >
            <OperationalTimeline matches={pool} />
          </PaywallGate>
          <div className="gp-terminal-v2__rail-trust hidden xl:block">
            <TrustStrip />
          </div>
        </aside>

        <section className="gp-terminal-v2__main">
          <motion.div variants={{ show: { transition: { staggerChildren: 0.05 } } }}>
            <div className="gp-terminal-v2__filters-row">
              <MatchFilters
                filter={filter}
                onFilter={setFilter}
                search={search}
                onSearch={setSearch}
                viewMode={viewMode}
                onViewMode={setViewMode}
                liveCount={kpis.live}
                upcomingCount={kpis.upcoming}
              />
              {can("audit_mode") ? (
                <TerminalAuditToggle enabled={auditMode} onChange={setAuditMode} />
              ) : (
                <a href="/upgrade?feature=audit_mode" className="gp-audit-locked">
                  Auditoria · Elite
                </a>
              )}
            </div>
          </motion.div>

          <div className="gp-terminal-v2__social-mobile xl:hidden">
            <SocialProofStrip />
          </div>

          <LiveOperationsGrid
            matches={matches}
            allMatches={allMatches}
            filter={filter}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            viewMode={viewMode}
            isLoading={isLoading}
            liveCount={kpis.live}
            upcomingCount={kpis.upcoming}
            auditMode={auditMode && can("audit_mode")}
            highlightFixtureId={hero?.match.fixtureId ?? null}
            dataSource={source}
            feedError={feedError}
          />
        </section>
      </div>
    </motion.div>
  );
}
