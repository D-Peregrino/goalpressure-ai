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
    isLoading,
  } = useLiveMatchCenter();
  const { auditMode, setAuditMode } = useTerminalAuditMode();
  const { can, limits } = useSubscription();
  const onboarding = useOnboarding();
  const { recent, watched, recordOpportunity, recordAlert, markWatched } =
    useRetentionHistory();

  const pool = allMatches.length > 0 ? allMatches : matches;

  const hero = useMemo(() => pickHeroOpportunity(pool), [pool]);

  const operationalAlerts = useMemo(
    () => buildOperationalAlerts(liveSignals, pool),
    [liveSignals, pool]
  );

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
      className="gp-terminal-v2 gp-terminal-v2--premium gp-terminal-v2--living gp-terminal-v2--flow gp-terminal-v2--polish gp-terminal-v2--commercial"
    >
      <TerminalPremiumAmbient />
      <OnboardingModal
        open={onboarding.open}
        step={onboarding.step}
        onStep={onboarding.setStep}
        onComplete={onboarding.complete}
        onSkip={onboarding.skip}
      />

      <UpgradeBanner />

      <div className="gp-terminal-v2__top-main gp-terminal-v2__top-main--stack">
        <TerminalHeader feedStatus={feedStatus} opsStatus={opsStatus} source={source} />
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

      <div className="gp-terminal-v2__desk">
        <aside className="gp-terminal-v2__rail gp-terminal-v2__rail--quiet">
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
          />
        </section>
      </div>
    </motion.div>
  );
}
