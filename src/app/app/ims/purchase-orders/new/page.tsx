import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsPurchaseOrderForm } from "@/components/ims/ims-purchase-order-form";
import { requireSession } from "@/lib/require-session";
import { listApprovedIndentsForPo } from "@/lib/ims/purchase-orders";

export default async function ImsNewPurchaseOrderPage() {
  const user = await requireSession("MANAGER", { module: "IMS" });
  const indents = await listApprovedIndentsForPo(user.organizationId);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="New purchase order"
        description="Create vendor PO from an approved indent — independent of sales orders."
        actions={
          <Link href="/app/ims/purchase-orders" className="ws-btn ws-btn-ghost">
            Back to list
          </Link>
        }
      />
      <section className="ws-ims-panel">
        {indents.length === 0 ? (
          <p className="ws-ims-help">
            No approved indents available.{" "}
            <Link href="/app/ims/indents">Approve an indent</Link> first.
          </p>
        ) : (
          <ImsPurchaseOrderForm
            indents={indents.map((indent) => ({
              id: indent.id,
              indentNumber: indent.indentNumber,
              siteName: indent.siteName,
              vendor: indent.vendor,
            }))}
          />
        )}
      </section>
    </div>
  );
}
