import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsPurchaseOrderForm } from "@/components/ims/ims-purchase-order-form";
import { requireSession } from "@/lib/require-session";
import { listApprovedIndentsForPo } from "@/lib/ims/purchase-orders";
import { listImsItems, listImsVendors } from "@/lib/ims/ims-store";

export default async function ImsNewPurchaseOrderPage() {
  const user = await requireSession("MANAGER", { module: "IMS" });
  const [indents, vendors, items] = await Promise.all([
    listApprovedIndentsForPo(user.organizationId),
    listImsVendors(user.organizationId),
    listImsItems(user.organizationId),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="New purchase order"
        description="Create an independent vendor PO, or optionally link an approved indent — not tied to sales orders."
        actions={
          <Link href="/app/ims/purchase-orders" className="ws-btn ws-btn-ghost">
            Back to list
          </Link>
        }
      />
      <section className="ws-ims-panel">
        {vendors.length === 0 || items.length === 0 ? (
          <p className="ws-ims-help">
            {vendors.length === 0 ? (
              <>
                Add a <Link href="/app/ims/vendors">vendor</Link> first.
              </>
            ) : (
              <>
                Add an <Link href="/app/ims/items">item</Link> first.
              </>
            )}
          </p>
        ) : (
          <>
            {indents.length === 0 ? (
              <p className="ws-ims-help">
                No approved indents yet — you can still create an independent PO below.{" "}
                <Link href="/app/ims/indents">Approve an indent</Link> later if you want to
                link one.
              </p>
            ) : null}
            <ImsPurchaseOrderForm
              indents={indents.map((indent) => ({
                id: indent.id,
                indentNumber: indent.indentNumber,
                siteName: indent.siteName,
                vendor: indent.vendor,
              }))}
              vendors={vendors.map((vendor) => ({
                id: vendor.id,
                name: vendor.name,
                code: vendor.code,
              }))}
              items={items.map((item) => ({
                id: item.id,
                code: item.code,
                name: item.name,
                uom: item.uom,
              }))}
            />
          </>
        )}
      </section>
    </div>
  );
}
