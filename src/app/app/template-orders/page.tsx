import { PageHeader } from "@/components/saas/page-header";
import { TemplateOrdersPanel } from "@/components/saas/template-orders-panel";
import { requireSession } from "@/lib/require-session";
import {
  listAllTemplateProducts,
  listTemplateOrders,
} from "@/lib/templates/store";
import { redirect } from "next/navigation";

export default async function TemplateOrdersPage() {
  const user = await requireSession();
  if (!user.isSuperAdmin) {
    redirect("/app");
  }

  const [orders, products] = await Promise.all([
    listTemplateOrders(),
    listAllTemplateProducts(),
  ]);

  return (
    <div className="saas-page ws-tasks-sf">
      <PageHeader
        title="Template store"
        description="Confirm UPI payments for AppSheet / Sheets / Excel templates, then auto-email the private copy link."
      />
      <TemplateOrdersPanel
        orders={orders.map((row) => ({
          id: row.id,
          customerName: row.customerName,
          customerEmail: row.customerEmail,
          customerPhone: row.customerPhone,
          paymentRef: row.paymentRef,
          paymentClaimedAt: row.paymentClaimedAt?.toISOString() ?? null,
          hasPaymentProof: row.paymentProofFileName != null,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
          product: {
            name: row.product.name,
            type: row.product.type,
            priceInr: row.product.priceInr,
            hasCopyLink: Boolean(row.product.copyLink?.trim()),
          },
        }))}
        products={products.map((row) => ({
          id: row.id,
          slug: row.slug,
          name: row.name,
          type: row.type,
          priceInr: row.priceInr,
          description: row.description,
          copyLink: row.copyLink,
          active: row.active,
          sortOrder: row.sortOrder,
        }))}
      />
    </div>
  );
}
