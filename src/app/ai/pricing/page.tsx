import type { Metadata } from "next";
import { AiSiteFooter, AiSiteHeader } from "@/components/marketing/ai-site-chrome";
import {
  WaFaqSection,
  WaPricingSection,
  WaProductCta,
} from "@/components/marketing/wa-product-sections";
import "@/components/marketing/wa-product.css";

export const metadata: Metadata = {
  title: "Pricing | Sheetomatic WhatsApp",
  description:
    "Task + WhatsApp Messages from ₹2,500/user/year. Tasks + WhatsApp AI full access — contact for enterprise plans.",
};

export default function SheetomaticAiPricingPage() {
  return (
    <main className="marketing-page marketing-site wa-product-page">
      <AiSiteHeader />
      <section className="wa-section wa-pricing-hero">
        <div className="wa-product-container">
          <div className="wa-section-head">
            <span className="wa-product-kicker">Sheetomatic on WhatsApp</span>
            <h1>Task delegation or full AI — clear pricing</h1>
            <p>
              Start with Task + WhatsApp Messages if you only need delegation, or
              choose Tasks + WhatsApp AI full access when customers message you on
              WhatsApp too.
            </p>
          </div>
        </div>
      </section>
      <WaPricingSection />
      <WaFaqSection />
      <WaProductCta />
      <AiSiteFooter />
    </main>
  );
}
