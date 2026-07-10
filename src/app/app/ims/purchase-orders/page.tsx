import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsPurchaseOrdersList } from "@/components/ims/ims-purchase-orders-list";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listPurchaseOrders } from "@/lib/ims/purchase-orders";

export default async function ImsPurchaseOrdersPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const orders = await listPurchaseOrders(user.organizationId);

  const rows = orders.map((order) => ({
    id: order.id,
    poNumber: order.poNumber,
    status: order.status,
    siteName: order.siteName,
    expectedDeliveryDate: order.expectedDeliveryDate,
    createdAt: order.createdAt,
    vendor: order.vendor,
    indent: order.indent,
    createdBy: order.createdBy,
    lines: order.lines.map((line) => ({
      quantity: Number(line.quantity),
      rate: line.rate != null ? Number(line.rate) : null,
      item: line.item,
    })),
  }));

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Purchase orders"
        description="Vendor PO with rates — raise from approved indent, then GRN on receipt."
        actions={
          <Link href="/app/ims/purchase-orders/new" className="ws-btn ws-btn-primary">
            New PO
          </Link>
        }
      />
      <section className="ws-ims-panel">
        <ImsPurchaseOrdersList
          orders={rows}
          canApprove={hasMinimumRole(user.role, "MANAGER")}
        />
      </section>
    </div>
  );
}
