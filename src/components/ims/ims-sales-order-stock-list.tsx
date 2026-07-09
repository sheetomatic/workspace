import Link from "next/link";
import { Package, ShoppingCart } from "lucide-react";
import { formatInr } from "@/lib/leads/categories";
import {
  salesOrderStatusLabel,
  type SalesOrderListItem,
} from "@/lib/leads/sales-order-types";

export function ImsSalesOrderStockList({
  orders,
}: {
  orders: SalesOrderListItem[];
}) {
  if (orders.length === 0) {
    return (
      <p className="ws-ims-help">
        No sales orders waiting for IMS stock verification. New orders appear here after
        advance payment creates a confirmed sales order.
      </p>
    );
  }

  return (
    <div className="ws-ims-table-wrap">
      <table className="ws-ims-table ws-ims-table-responsive">
        <thead>
          <tr>
            <th>Order</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Value</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id}>
              <td data-label="Order">
                <Link href={`/app/sales-orders/${order.id}`}>{order.orderNumber}</Link>
              </td>
              <td data-label="Customer">
                {order.lead.name || order.lead.company || order.lead.phone || "—"}
              </td>
              <td data-label="Status">
                <span
                  className={`sales-order-status-badge status-${order.status.toLowerCase()}`}
                >
                  {salesOrderStatusLabel(order.status)}
                </span>
              </td>
              <td data-label="Value">{formatInr(Number(order.orderValue))}</td>
              <td data-label="Actions">
                <div className="sales-order-cta-row ims-so-stock-actions">
                  <Link className="btn-secondary btn-sm" href="/app/ims/stock">
                    <Package size={14} aria-hidden />
                    Stock levels
                  </Link>
                  <Link className="btn-secondary btn-sm" href={`/app/sales-orders/${order.id}`}>
                    <ShoppingCart size={14} aria-hidden />
                    Order
                  </Link>
                  {order.stockCheckFmsInstanceId ? (
                    <Link
                      className="btn-secondary btn-sm"
                      href={`/app/fms/instances/${order.stockCheckFmsInstanceId}`}
                    >
                      Stock FMS
                    </Link>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
