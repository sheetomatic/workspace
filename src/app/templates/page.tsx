import type { Metadata } from "next";
import { MarketingPage, SiteFooter, SiteHeader } from "@/app/components";
import { TemplatesStoreContent } from "@/components/marketing/templates-store-content";
import { marketingMetadata } from "@/lib/marketing-metadata";
import { parseTemplateCategoryParam } from "@/lib/templates/categories";
import { listCloudSoftwareCatalog } from "@/lib/templates/cloud-softwares";
import { listActiveTemplateProducts } from "@/lib/templates/store";
import { templateCheckoutReady } from "@/lib/templates/gateway";
import { getPrimaryOrganization } from "@/lib/platform";
import { resolveQuotationAccount } from "@/lib/leads/seller-account";
import { gstinStateCode } from "@/lib/leads/gst-invoice";
import { TEMPLATE_PRODUCT_SEEDS } from "@/lib/templates/seed-products";
import { templatePriceInr } from "@/lib/templates/commerce";

export const dynamic = "force-dynamic";

export const metadata: Metadata = marketingMetadata({
  title: "Templates | Google Sheets, AppSheet & Cloud Softwares",
  description:
    "Google Sheets Based, AppSheet Based, and Cloud Softwares — including Mobile Shop Counter, a native Sheetomatic app for mobile shops. Not a spreadsheet.",
  path: "/templates",
});

async function loadCatalog() {
  try {
    const [products, org] = await Promise.all([
      listActiveTemplateProducts(),
      getPrimaryOrganization(),
    ]);
    return {
      products,
      seller: org ? resolveQuotationAccount(org) : null,
      available: Boolean(org),
    };
  } catch {
    // Preserve the live catalogue fallback, without pretending offline products can be purchased.
    return {
      products: TEMPLATE_PRODUCT_SEEDS.filter((p) => p.active !== false).map(
        (p) => ({
          id: p.slug,
          slug: p.slug,
          name: p.name,
          type: p.type,
          priceInr: templatePriceInr(p.priceInr),
          description: p.description,
          thumbnailUrl: p.thumbnailUrl ?? null,
          purchasable: false,
        }),
      ),
      seller: null,
      available: false,
    };
  }
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  // Browsing must not overwrite admin edits or deactivate products.
  const { products, seller, available } = await loadCatalog();
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
          purchasable: row.purchasable,
        }))}
        cloudProducts={cloudProducts}
        initialCategory={parseTemplateCategoryParam(category)}
        checkoutEnabled={available && templateCheckoutReady()}
        sellerStateCode={seller ? (gstinStateCode(seller.gstin) ?? "22") : "22"}
      />
      <SiteFooter />
    </MarketingPage>
  );
}
