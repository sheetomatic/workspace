import type { Metadata } from "next";
import { ProductsPageContent } from "@/components/marketing/products-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Products",
  description:
    "FMS, IMS, CRM, and workspace apps for MSME operations — systems and teams built so your business scales without you and stays profitable.",
  path: "/products",
});

export default function ProductsPage() {
  return <ProductsPageContent />;
}
