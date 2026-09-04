import type { Metadata } from "next";
import { AddonsPageContent } from "@/components/marketing/addons-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Add-ons & licensed kits",
  description:
    "Right-to-use FMS kits and workspace modules for clinics, workshops, jewellery, and other Sheetomatic businesses. Monthly license, native in-app forms.",
  path: "/addons",
});

export default function AddonsPage() {
  return <AddonsPageContent />;
}
