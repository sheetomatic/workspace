import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsPurchaseOrderForm } from "@/components/ims/ims-purchase-order-form";
import { requireSession } from "@/lib/require-session";
import {
  getPurchaseOrder,
  listApprovedIndentsForPo,
} from "@/lib/ims/purchase-orders";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ImsEditPurchaseOrderPage({ params }: PageProps) {
  const user = await requireSession("MANAGER", { module: "IMS" });
  const { id } = await params;
  const [order, indents] = await Promise.all([
    getPurchaseOrder(user.organizationId, id),
    listApprovedIndentsForPo(user.organizationId),
  ]);

  if (!order) {
    notFound();
  }

  if (order.status !== "DRAFT") {
    redirect("/app/ims/purchase-orders");
  }

  const linesJson = JSON.stringify(
    order.lines.map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity),
      rate: line.rate != null ? Number(line.rate) : undefined,
      notes: line.notes ?? undefined,
    })),
  );

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title={`Edit ${order.poNumber}`}
        description="Update draft purchase order — submit when ready for approval."
        actions={
          <Link href="/app/ims/purchase-orders" className="ws-btn ws-btn-ghost">
            Back to list
          </Link>
        }
      />
      <section className="ws-ims-panel">
        <ImsPurchaseOrderForm
          indents={indents.map((indent) => ({
            id: indent.id,
            indentNumber: indent.indentNumber,
            siteName: indent.siteName,
            vendor: indent.vendor,
          }))}
          initialValues={{
            purchaseOrderId: order.id,
            poNumber: order.poNumber,
            indentId: order.indentId,
            siteName: order.siteName,
            expectedDeliveryDate: order.expectedDeliveryDate?.toISOString() ?? null,
            notes: order.notes,
            linesJson,
          }}
        />
      </section>
    </div>
  );
}
