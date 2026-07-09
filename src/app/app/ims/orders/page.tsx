import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsSalesOrderStockList } from "@/components/ims/ims-sales-order-stock-list";
import { listSalesOrders } from "@/lib/leads/sales-orders";
import { requireSession } from "@/lib/require-session";

export default async function ImsSalesOrderStockPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const { orders, total } = await listSalesOrders(user.organizationId, {
    pipeline: "stock_fulfillment",
  });

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Sales order stock (IMS)"
        description="Verify on-hand inventory in IMS against open sales orders. Stock check FMS records the fulfillment decision."
        actions={
          <>
            <Link href="/app/ims/stock" className="btn-secondary btn-sm">
              All stock levels
            </Link>
            <Link href="/app/sales-orders" className="btn-secondary btn-sm">
              Sales orders
            </Link>
          </>
        }
      />

      <section className="ws-ims-panel">
        <div className="ws-ims-panel-head">
          <h2>Orders awaiting IMS check</h2>
          <span className="ws-ims-help">{total} open</span>
        </div>
        <ImsSalesOrderStockList orders={orders} />
      </section>
    </div>
  );
}
