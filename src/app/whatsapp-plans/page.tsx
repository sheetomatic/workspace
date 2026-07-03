import type { Metadata } from "next";
import {
  FinalCta,
  MarketingPage,
  PageHero,
  SiteFooter,
  SiteHeader,
} from "../components";
import { WhatsappPlansShowcase } from "@/components/marketing/whatsapp-plans-showcase";
import { whatsappPlansPage } from "@/lib/content/whatsapp-plans-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";
import "@/components/marketing/whatsapp-plans.css";

export const metadata: Metadata = marketingMetadata({
  title: "WhatsApp API Subscription",
  description:
    "Compare Sheetomatic unofficial WhatsApp recharge plans and official WhatsApp Business plans for task delegation, AI replies, inbox, and CRM.",
  path: "/whatsapp-plans",
});

export default function WhatsappPlansPage() {
  const page = whatsappPlansPage;

  return (
    <MarketingPage>
      <SiteHeader />
      <PageHero eyebrow={page.eyebrow} title={page.title} text={page.lead} />
      <WhatsappPlansShowcase />
      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
