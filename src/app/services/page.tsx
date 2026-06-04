import type { Metadata } from "next";
import { ServicesHubContent } from "@/components/marketing/services-hub-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Services",
  description:
    "End-to-end AI-powered solutions for Indian MSMEs — WhatsApp automation, CRM, MIS, HR, inventory, tasks, and workflow delivery.",
  path: "/services",
});

export default function ServicesPage() {
  return <ServicesHubContent />;
}
