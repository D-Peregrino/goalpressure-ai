"use client";

import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import TerminalPreviewSection from "@/components/landing/TerminalPreviewSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ScreenshotsSection from "@/components/landing/ScreenshotsSection";
import ValueSection from "@/components/landing/ValueSection";
import BacktestSection from "@/components/landing/BacktestSection";
import PlansSection from "@/components/landing/PlansSection";
import SocialProofStrip from "@/components/commercial/SocialProofStrip";
import WaitlistSection from "@/components/landing/WaitlistSection";
import FooterSection from "@/components/landing/FooterSection";

export default function LandingPage() {
  return (
    <div className="gp-landing">
      <div className="gp-landing__ambient" aria-hidden />
      <LandingNav />
      <HeroSection />
      <TerminalPreviewSection />
      <ValueSection />
      <FeaturesSection />
      <ScreenshotsSection />
      <BacktestSection />
      <PlansSection />
      <section className="gp-landing-section gp-landing-section--muted">
        <div className="gp-landing-container gp-landing-container--narrow">
          <SocialProofStrip />
        </div>
      </section>
      <WaitlistSection />
      <FooterSection />
    </div>
  );
}
