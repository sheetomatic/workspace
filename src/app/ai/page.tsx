import type { Metadata } from "next";
import { SheetomaticAiHomePage } from "@/components/marketing/wa-product-home";

export const metadata: Metadata = {
  title: "Sheetomatic AI | Attract, Convert, Empower on WhatsApp",
  description:
    "WhatsApp AI captures leads. CRM inbox and follow-ups convert sales. Shared workspace empowers teams to close while AI handles routine.",
};

export default function SheetomaticAiMarketingHome() {
  return <SheetomaticAiHomePage />;
}
