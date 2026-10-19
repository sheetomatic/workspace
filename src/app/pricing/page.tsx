import type { Metadata } from "next";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { EmReadyPricing } from "@/components/marketing/em-ready-pricing";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Pricing | Business Systems Suite",
  description:
    "Ready-to-use business systems with setup handled by Sheetomatic. Starter ₹4,999/month, Scale ₹6,999/month, Enterprise ₹9,999/month. 3-day trial available. No yearly commitment.",
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <EmReadyPricing />
      <SiteFooter />
    </MarketingPage>
  );
}
