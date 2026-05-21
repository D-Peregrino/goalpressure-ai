"use client";

import LandingNav from "@/components/landing/LandingNav";
import HeroSection from "@/components/landing/HeroSection";
import TerminalPreviewSection from "@/components/landing/TerminalPreviewSection";
import EnginesSection from "@/components/landing/EnginesSection";
import BacktestSection from "@/components/landing/BacktestSection";
import PlansSection from "@/components/landing/PlansSection";
import FooterSection from "@/components/landing/FooterSection";

export default function LandingPage() {
  return (
    <div className="gp-landing">
      <div className="gp-landing__ambient" aria-hidden />
      <LandingNav />
      <HeroSection />
      <TerminalPreviewSection />
      <EnginesSection />
      <BacktestSection />
      <PlansSection />
      <FooterSection />
    </div>
  );
}
