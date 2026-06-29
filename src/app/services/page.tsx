import type { Metadata } from "next";
import { ServicesHubContent } from "@/components/marketing/services-hub-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Services",
  description:
    "Systems, teams, and WhatsApp AI for Indian MSMEs — CRM, FMS, IMS, MIS, HR, inventory, and workflow delivery that scales without the owner.",
  path: "/services",
});

export default function ServicesPage() {
  return <ServicesHubContent />;
}
