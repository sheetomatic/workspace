import type { Metadata } from "next";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { EmReadyPricing } from "@/components/marketing/em-ready-pricing";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Pricing | BCI Suite & Modules",
  description:
    "Run FMS, EM, and Check Lists without Google Sheets lag or crash. BCI Suite from ₹4,999. CRM ₹2,499 for 8 users.",
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
