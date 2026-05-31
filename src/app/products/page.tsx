import type { Metadata } from "next";
import { ProductsPageContent } from "@/components/marketing/products-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Products",
  description:
    "CRM, attendance, inventory, ERP, and custom Google Workspace apps built for MSME operations.",
  path: "/products",
});

export default function ProductsPage() {
  return <ProductsPageContent />;
}
