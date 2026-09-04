import type { Metadata } from "next";
import { AddonsPageContent } from "@/components/marketing/addons-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Add-ons & licensed kits",
  description:
    "Mobile shop app for shops that sell new and used phones, do repairs, and sell accessories. Monthly right-to-use license.",
  path: "/addons",
});

export default function AddonsPage() {
  return <AddonsPageContent />;
}
