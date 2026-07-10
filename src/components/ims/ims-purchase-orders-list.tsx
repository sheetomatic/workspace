"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ImsPurchaseOrderStatus } from "@prisma/client";
import { updatePurchaseOrderStatusAction } from "@/app/app/ims/actions";
import { PURCHASE_ORDER_STATUS_LABELS } from "@/lib/ims/purchase-order-labels";
import { formatImsCurrency, formatImsQty } from "@/lib/ims/stock-status";

export type PurchaseOrderListRow = {
  id: string;
  poNumber: string;
  status: ImsPurchaseOrderStatus;
  siteName: string | null;
  expectedDeliveryDate: Date | null;
  createdAt: Date;
  vendor: { name: string; code: string } | null;
  indent: { indentNumber: string } | null;
  lines: Array<{
    quantity: number;
    rate: number | null;
    item: { code: string; name: string; uom: string };
  }>;
};

function statusClass(status: ImsPurchaseOrderStatus) {
  switch (status) {
    case "APPROVED":
    case "SENT":
    case "CLOSED":
      return "ws-ims-pill-green";
    case "CANCELLED":
      return "ws-ims-pill-red";
    case "PENDING":
      return "ws-ims-pill-orange";
    default:
      return "ws-ims-pill-blue";
  }
}

function lineTotal(quantity: number, rate: number | null) {
  const unitRate = rate ?? 0;
  if (!Number.isFinite(quantity) || !Number.isFinite(unitRate)) {
    return 0;
  }
  return quantity * unitRate;
}

function formatLineSummary(
  lines: PurchaseOrderListRow["lines"],
) {
  return lines
    .map((line) => {
      const qty = formatImsQty(line.quantity, line.item.uom);
      const rate = line.rate != null ? ` @ ${formatImsCurrency(line.rate)}` : "";
      return `${line.item.code}: ${qty}${rate}`;
    })
    .join("; ");
}

export function ImsPurchaseOrdersList({
  orders,
  canApprove,
}: {
  orders: PurchaseOrderListRow[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function act(id: string, status: "APPROVED" | "SENT" | "CANCELLED" | "PENDING") {
    startTransition(async () => {
      const result = await updatePurchaseOrderStatusAction(id, status);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  if (orders.length === 0) {
    return (
      <p className="ws-apple-record-empty">
        No purchase orders yet. Create one from an approved indent.
      </p>
    );
  }

  return (
    <>
      {message ? <p className="ws-ims-help">{message}</p> : null}
      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-apple-data-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>PO #</th>
              <th>Status</th>
              <th>Vendor</th>
              <th>Indent</th>
              <th>Lines</th>
              <th>Value</th>
              <th>Delivery</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((row) => {
              const total = row.lines.reduce(
                (sum, line) => sum + lineTotal(line.quantity, line.rate),
                0,
              );

              return (
                <tr key={row.id}>
                  <td>
                    <span className="ws-apple-cell-primary">{row.poNumber}</span>
                  </td>
                  <td>
                    <span className={`ws-ims-pill ${statusClass(row.status)}`}>
                      {PURCHASE_ORDER_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                  <td className="ws-apple-cell-secondary">{row.vendor?.name ?? "—"}</td>
                  <td className="ws-apple-cell-secondary">
                    {row.indent?.indentNumber ?? "—"}
                  </td>
                  <td className="ws-apple-cell-lines">{formatLineSummary(row.lines) || "—"}</td>
                  <td className="ws-apple-cell-primary">
                    {total > 0 ? formatImsCurrency(total) : "—"}
                  </td>
                  <td className="ws-apple-cell-secondary">
                    {row.expectedDeliveryDate
                      ? row.expectedDeliveryDate.toLocaleDateString("en-IN")
                      : "—"}
                  </td>
                  <td className="ws-apple-cell-secondary">
                    {row.createdAt.toLocaleDateString("en-IN")}
                  </td>
                  <td>
                    <div className="ws-ims-inline-actions">
                      {row.status === "DRAFT" ? (
                        <Link
                          href={`/app/ims/purchase-orders/${row.id}/edit`}
                          className="ws-btn ws-btn-secondary ws-btn-small"
                        >
                          Edit draft
                        </Link>
                      ) : null}
                      {canApprove && row.status === "PENDING" ? (
                        <>
                          <button
                            type="button"
                            className="ws-btn ws-btn-primary ws-btn-small"
                            disabled={pending}
                            onClick={() => act(row.id, "APPROVED")}
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            className="ws-btn ws-btn-ghost ws-btn-small"
                            disabled={pending}
                            onClick={() => act(row.id, "CANCELLED")}
                          >
                            Cancel
                          </button>
                        </>
                      ) : null}
                      {canApprove && row.status === "APPROVED" ? (
                        <button
                          type="button"
                          className="ws-btn ws-btn-secondary ws-btn-small"
                          disabled={pending}
                          onClick={() => act(row.id, "SENT")}
                        >
                          Mark sent
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
