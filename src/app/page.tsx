import { ContributorSection } from "@/components/landing/ContributorSection";
import { CustomDataSection } from "@/components/landing/CustomDataSection";
import { FinalCta } from "@/components/landing/FinalCta";
import { Footer } from "@/components/landing/Footer";
import { GearSection } from "@/components/landing/GearSection";
import { HeroSection } from "@/components/landing/HeroSection";
import { MarketplaceSection } from "@/components/landing/MarketplaceSection";
import { Navbar } from "@/components/landing/Navbar";

export default function Home() {
  return (
    <main id="top" className="overflow-clip">
      <Navbar />
      <HeroSection />
      <MarketplaceSection />
      <ContributorSection />
      <CustomDataSection />
      <GearSection />
      <FinalCta />
      <Footer />
    </main>
  );
}
