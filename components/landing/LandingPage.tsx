"use client";

import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import TerminalPreviewSection from "@/components/landing/TerminalPreviewSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import ScreenshotsSection from "@/components/landing/ScreenshotsSection";
import EnginesSection from "@/components/landing/EnginesSection";
import BacktestSection from "@/components/landing/BacktestSection";
import PlansSection from "@/components/landing/PlansSection";
import WaitlistSection from "@/components/landing/WaitlistSection";
import FooterSection from "@/components/landing/FooterSection";

export default function LandingPage() {
  return (
    <div className="gp-landing">
      <div className="gp-landing__ambient" aria-hidden />
      <LandingNav />
      <HeroSection />
      <TerminalPreviewSection />
      <FeaturesSection />
      <ScreenshotsSection />
      <EnginesSection />
      <BacktestSection />
      <PlansSection />
      <WaitlistSection />
      <FooterSection />
    </div>
  );
}
