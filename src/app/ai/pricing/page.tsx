import type { Metadata } from "next";
import { AiPricingEnquirePage } from "@/components/marketing/ai-pricing-enquire";

export const metadata: Metadata = {
  title: "Pricing | Sheetomatic AI",
  description:
    "Enquire about Task + WhatsApp Messages for your team. We share a tailored quote after a quick chat — no surprises.",
};

export default function SheetomaticAiPricingPage() {
  return <AiPricingEnquirePage />;
}
