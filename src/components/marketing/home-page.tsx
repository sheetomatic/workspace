import { FinalCta, SiteFooter, SiteHeader } from "@/app/components";
import { WorkShowcaseSection } from "./client-projects-showcase";
import { BciFrameworkSection } from "./bci-framework-section";
import { FocusOffersSection } from "./focus-offers-section";
import { HowWeWorkSection } from "./how-we-work-section";
import { AiEnabledTasksSection } from "./ai-enabled-tasks-section";
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

      <WorkShowcaseSection />

      <UspSection />

      <AiEnabledTasksSection />

      <FocusOffersSection />

      <FinalCta />
      <SiteFooter />
    </main>
  );
}
