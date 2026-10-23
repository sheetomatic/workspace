import type { Metadata } from "next";
import { ProductsPageContent } from "@/components/marketing/products-page-content";
import { marketingMetadata } from "@/lib/marketing-metadata";

export const metadata: Metadata = marketingMetadata({
  title: "Case Studies",
  description:
    "Real Sheetomatic client stories: how MSMEs moved from scattered updates to connected apps, software, and operating systems.",
  path: "/products",
});

export default function ProductsPage() {
  return <ProductsPageContent />;
}
