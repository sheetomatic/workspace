import type { Metadata } from "next";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { EmReadyPricing } from "@/components/marketing/em-ready-pricing";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Pricing | BCI Suite & Modules",
  description:
    "Buy BCI Suite (complete EM Ready package from ₹4,999/mo) or individual modules — FMS, Tasks/EA, CRM, IMS, HR from ₹2,499/mo. Compare Suite vs modules.",
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
