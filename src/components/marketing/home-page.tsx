import { FinalCta, SiteFooter, SiteHeader } from "@/app/components";
import { WorkShowcaseSection } from "./client-projects-showcase";
import { BciFrameworkSection } from "./bci-framework-section";
import { FocusOffersSection } from "./focus-offers-section";
import { HowWeWorkSection } from "./how-we-work-section";
import { HomeProofVideosSection } from "./home-proof-videos-section";
import { UspSection } from "./usp-section";
import {
  AudienceFilterSection,
  SalesHeroSection,
  SpreadsheetPainSection,
} from "./sales-journey-sections";

export function HomePage() {
  return (
    <main id="main" className="marketing-page marketing-site">
      <SiteHeader />

      <SalesHeroSection />

      <AudienceFilterSection />

      <SpreadsheetPainSection />

      <HowWeWorkSection />

      <BciFrameworkSection />

      {/* Primary dual pair: FMS + WhatsApp→Tasks */}
      <FocusOffersSection />

      {/* Supporting clips only — no FMS / WhatsApp→Tasks duplicates */}
      <HomeProofVideosSection />

      <WorkShowcaseSection />

      <UspSection />

      <FinalCta />
      <SiteFooter />
    </main>
  );
}
