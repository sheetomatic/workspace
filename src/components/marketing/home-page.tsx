import { FinalCta, SiteFooter, SiteHeader } from "@/app/components";
import { BusinessLibrarySection } from "./business-library-section";
import { WorkShowcaseSection } from "./client-projects-showcase";
import {
  SalesHeroSection,
  SpreadsheetPainSection,
} from "./sales-journey-sections";
import { TechnologyLogoStrip } from "./technology-logo-strip";
import { FestiveOffers } from "./festive-offers";
import { publicBanners } from "@/lib/marketing-banner-store";

export async function HomePage() {
  const banners = await publicBanners();
  return (
    <main id="main" className="marketing-page marketing-site">
      <FestiveOffers offers={banners} />
      <SiteHeader />

      <SalesHeroSection />

      <BusinessLibrarySection />

      <SpreadsheetPainSection />

      <WorkShowcaseSection />

      <TechnologyLogoStrip />

      <FinalCta />
      <SiteFooter />
    </main>
  );
}
