import { AiSiteFooter, AiSiteHeader } from "@/components/marketing/ai-site-chrome";
import {
  WaFaqSection,
  WaFeatureGrid,
  WaIndustriesSection,
  WaLaunchSteps,
  WaPricingSection,
  WaProductCta,
  WaProductHero,
  WaTestimonialsSection,
} from "@/components/marketing/wa-product-sections";
import "./wa-product.css";

export function SheetomaticAiHomePage() {
  return (
    <main className="marketing-page marketing-site wa-product-page">
      <AiSiteHeader />
      <WaProductHero secondaryHref="/ai/pricing" secondaryLabel="See pricing" />
      <WaFeatureGrid />
      <WaLaunchSteps />
      <WaIndustriesSection />
      <WaPricingSection />
      <WaTestimonialsSection />
      <WaFaqSection />
      <WaProductCta />
      <AiSiteFooter />
    </main>
  );
}

/** @deprecated Use SheetomaticAiHomePage */
export const WaProductHomePage = SheetomaticAiHomePage;
