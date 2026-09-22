import type { Metadata } from "next";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { EmReadyPricing } from "@/components/marketing/em-ready-pricing";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Pricing | BCI Suite & Modules",
  description:
    "Buy BCI Suite: ₹4,999 FMS + EM + PC + MIS; ₹9,999 adds Check Lists + Tasks; ₹24,999 adds HRMS + IMS. CRM ₹2,499 for 8 users.",
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
