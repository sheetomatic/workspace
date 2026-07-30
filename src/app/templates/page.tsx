import type { Metadata } from "next";
import {
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "@/app/components";
import { TemplatesStoreContent } from "@/components/marketing/templates-store-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import { listActiveTemplateProducts } from "@/lib/templates/store";

export const metadata: Metadata = marketingMetadata({
  title: "AppSheet & Google Sheets Templates | Smart Office Templates",
  description:
    "Buy AppSheet and Google Sheets templates. Pay on UPI — we verify payment, then email your private copy link automatically.",
  path: "/templates",
});

export default async function TemplatesPage() {
  const products = await listActiveTemplateProducts();

  return (
    <MarketingPage>
      <SiteHeader />
      <TemplatesStoreContent
        products={products.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          type: row.type,
          priceInr: row.priceInr,
          description: row.description,
          thumbnailUrl: row.thumbnailUrl,
        }))}
      />
      <SiteFooter />
    </MarketingPage>
  );
}
