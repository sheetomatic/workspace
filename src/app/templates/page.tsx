import type { Metadata } from "next";
import {
  MarketingPage,
  SiteFooter,
  SiteHeader,
} from "@/app/components";
import { TemplatesStoreContent } from "@/components/marketing/templates-store-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import { parseTemplateCategoryParam } from "@/lib/templates/categories";
import { listCloudSoftwareCatalog } from "@/lib/templates/cloud-softwares";
import {
  listActiveTemplateProducts,
  seedTemplateProducts,
} from "@/lib/templates/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = marketingMetadata({
  title: "Templates | Google Sheets, AppSheet & Cloud Softwares",
  description:
    "Google Sheets Based, AppSheet Based, and Cloud Softwares — including Mobile Shop Counter, a native Sheetomatic app for mobile shops. Not a spreadsheet.",
  path: "/templates",
});

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  await seedTemplateProducts();
  const products = await listActiveTemplateProducts();
  const cloudProducts = listCloudSoftwareCatalog();

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
        cloudProducts={cloudProducts}
        initialCategory={parseTemplateCategoryParam(category)}
      />
      <SiteFooter />
    </MarketingPage>
  );
}
