import Link from "next/link";
import LandingNav from "@/components/landing/LandingNav";
import FooterSection from "@/components/landing/FooterSection";

export default function MarketingLayout({
  children,
  narrow = false,
}: {
  children: React.ReactNode;
  narrow?: boolean;
}) {
  return (
    <div className="gp-marketing">
      <div className="gp-marketing__ambient" aria-hidden />
      <LandingNav />
      <main className={`gp-marketing__main ${narrow ? "gp-marketing__main--narrow" : ""}`}>
        {children}
      </main>
      <FooterSection />
    </div>
  );
}
