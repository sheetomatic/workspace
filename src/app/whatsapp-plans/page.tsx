import type { Metadata } from "next";
import {
  FinalCta,
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "../components";
import { WhatsappPlansShowcase } from "@/components/marketing/whatsapp-plans-showcase";
import { marketingMetadata } from "@/lib/marketing-metadata";
import "@/components/marketing/minimal-premium.css";
import "@/components/marketing/whatsapp-plans.css";

export const metadata: Metadata = marketingMetadata({
  title: "WhatsApp API & Automation Pricing",
  description:
    "Compare Sheetomatic API recharge plans and official WhatsApp Business panel plans for messaging, automation, team inboxes, chatbots, API, and webhooks.",
  path: "/whatsapp-plans",
});

export default function WhatsappPlansPage() {
  return (
    <MarketingPage>
      <SiteHeader />
      <WhatsappPlansShowcase />
      <FinalCta />
      <SiteFooter />
    </MarketingPage>
  );
}
