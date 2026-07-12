import type { Metadata } from "next";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { EmReadyPricing } from "@/components/marketing/em-ready-pricing";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Pricing | EM Ready Workspace",
  description:
    "EM Ready Workspace plans for Indian MSMEs — Starter from ₹4,999/mo (8 users), Growth, Scale up to 50 users. FMS, tasks, and Monday EM without MIS prep.",
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
