"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Package, Truck } from "lucide-react";
import { SalesOrderProcessCell } from "@/components/saas/sales-order-process-cell";
import { formatInr } from "@/lib/leads/categories";
import {
  salesOrderStatusLabel,
  type SalesOrderListItem,
  type SalesOrderStatus,
} from "@/lib/leads/sales-order-types";

const STATUS_FILTER_OPTIONS: Array<{
  value: SalesOrderStatus | "ALL";
  label: string;
}> = [
  { value: "ALL", label: "All statuses" },
  { value: "CONFIRMED", label: "Order confirmed" },
  { value: "STOCK_CHECK", label: "IMS stock check" },
  { value: "PO_PENDING", label: "PO pending" },
  { value: "PO_IN_PROGRESS", label: "PO in progress" },
  { value: "DISPATCH_PENDING", label: "Dispatch pending" },
  { value: "DISPATCHED", label: "Dispatched" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "CANCELLED", label: "Cancelled" },
];

export function SalesOrdersList({
  orders,
  total,
  status,
  q,
}: {
  orders: SalesOrderListItem[];
  total: number;
  status: SalesOrderStatus | "ALL";
  q: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilters = status !== "ALL" || Boolean(q.trim());

  function buildHref(next: { status?: string; q?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.status !== undefined) {
      if (next.status === "ALL") {
        params.delete("status");
      } else {
        params.set("status", next.status);
      }
    }
    if (next.q !== undefined) {
      if (next.q.trim()) {
        params.set("q", next.q.trim());
      } else {
        params.delete("q");
      }
    }
    const query = params.toString();
    return query ? `/app/sales-orders?${query}` : "/app/sales-orders";
  }

  return (
    <section className="ws-sf-list-view sales-orders-list" aria-label="Sales orders list">
      <header className="sales-orders-toolbar">
        <form
          className="sales-orders-search"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const input = form.elements.namedItem("q") as HTMLInputElement;
            router.push(buildHref({ q: input.value }));
          }}
        >
          <input
            name="q"
            type="search"
            className="sales-orders-search-input"
            placeholder="Search by SO number, lead, or company"
            defaultValue={q}
            aria-label="Search sales orders"
          />
          <button type="submit" className="btn-secondary btn-sm">
            Search
          </button>
        </form>

        <label className="sales-orders-status-filter">
          <span>Status</span>
          <select
            value={status}
            onChange={(event) =>
              router.push(
                buildHref({
                  status: event.target.value as SalesOrderStatus | "ALL",
                }),
              )
            }
            aria-label="Filter by status"
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        {hasFilters ? (
          <Link href="/app/sales-orders" className="btn-secondary btn-sm sales-orders-clear">
            Clear
          </Link>
        ) : null}

        <span className="sales-orders-result-count" aria-live="polite">
          {total} {total === 1 ? "order" : "orders"}
        </span>
      </header>

      {orders.length === 0 ? (
        <div className="sales-orders-empty">
          <div className="sales-orders-empty-icon" aria-hidden>
            <Package size={28} strokeWidth={1.5} />
          </div>
          <h2>
            {hasFilters
              ? "No orders match your filters"
              : "No sales orders yet"}
          </h2>
          <p>
            {hasFilters
              ? "Try a different status or search term."
              : "Orders are created automatically when you record advance payment on a locked quotation in Leads."}
          </p>
          {!hasFilters ? (
            <ol className="sales-orders-empty-steps">
              <li>Create a lead and build a quotation</li>
              <li>Send quotation and record advance payment</li>
              <li>Sales Order FMS starts — track fulfillment here</li>
            </ol>
          ) : null}
          <div className="sales-orders-empty-actions">
            <Link href="/app/leads" className="btn-primary btn-sm">
              Go to Leads
            </Link>
            {hasFilters ? (
              <Link href="/app/sales-orders" className="btn-secondary btn-sm">
                Show all orders
              </Link>
            ) : (
              <Link href="/app/fms/lines" className="btn-secondary btn-sm">
                <Truck size={14} aria-hidden />
                Live pipelines
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="sales-orders-table-wrap">
          <table className="sales-orders-table">
            <thead>
              <tr>
                <th scope="col">Sales order</th>
                <th scope="col">Customer</th>
                <th scope="col">Status</th>
                <th scope="col">FMS process</th>
                <th scope="col">Order value</th>
                <th scope="col">Balance</th>
                <th scope="col">Updated</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="sales-orders-cell-so">
                    <Link
                      href={`/app/sales-orders/${order.id}`}
                      className="sales-orders-so-link"
                    >
                      {order.orderNumber}
                    </Link>
                    {order.quotationNumber ? (
                      <span className="sales-orders-quotation-ref">
                        {order.quotationNumber}
                      </span>
                    ) : null}
                  </td>
                  <td>
                    <Link
                      href={`/app/leads?leadId=${order.lead.id}`}
                      className="sales-orders-lead-link"
                    >
                      <strong>
                        {order.lead.name ||
                          order.lead.company ||
                          order.lead.phone ||
                          "Lead"}
                      </strong>
                      {order.lead.company && order.lead.name ? (
                        <span>{order.lead.company}</span>
                      ) : null}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`sales-order-status-badge status-${order.status.toLowerCase()}`}
                    >
                      {salesOrderStatusLabel(order.status)}
                    </span>
                  </td>
                  <td>
                    <SalesOrderProcessCell order={order} />
                  </td>
                  <td className="sales-orders-cell-amount">
                    {formatInr(Number(order.orderValue))}
                  </td>
                  <td className="sales-orders-cell-amount">
                    {formatInr(Number(order.balanceAmount))}
                  </td>
                  <td className="sales-orders-cell-date">
                    {new Date(order.updatedAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
