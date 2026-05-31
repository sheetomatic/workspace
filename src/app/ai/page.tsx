import type { Metadata } from "next";
import { SheetomaticAiHomePage } from "@/components/marketing/wa-product-home";

export const metadata: Metadata = {
  title: "Sheetomatic AI | WhatsApp Tasks & AI",
  description:
    "Task + WhatsApp Messages for delegation, or Tasks + WhatsApp AI full access for customer chatbot, CRM inbox, and lead capture.",
};

export default function SheetomaticAiMarketingHome() {
  return <SheetomaticAiHomePage />;
}
