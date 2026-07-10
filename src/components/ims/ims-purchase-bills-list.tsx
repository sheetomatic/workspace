"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ImsPurchaseBillStatus } from "@prisma/client";
import { postPurchaseBillAction } from "@/app/app/ims/actions";
import { formatImsCurrency } from "@/lib/ims/stock-status";

export type PurchaseBillRow = {
  id: string;
  billNumber: string;
  status: ImsPurchaseBillStatus;
  billDate: Date;
  amount: unknown;
  grnReference: string | null;
  invoiceNumber: string | null;
  vendor: { name: string; code: string };
};

export function ImsPurchaseBillsList({ bills }: { bills: PurchaseBillRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function post(id: string) {
    startTransition(async () => {
      const result = await postPurchaseBillAction(id);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  if (bills.length === 0) {
    return <p className="ws-ims-help">No purchase bills yet.</p>;
  }

  return (
    <>
      {message ? <p className="ws-ims-help">{message}</p> : null}
      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>Bill #</th>
              <th>Vendor</th>
              <th>Date</th>
              <th>Amount</th>
              <th>GRN ref</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {bills.map((bill) => (
              <tr key={bill.id}>
                <td data-label="Bill #">
                  <strong>{bill.billNumber}</strong>
                </td>
                <td data-label="Vendor">{bill.vendor.name}</td>
                <td data-label="Date">{bill.billDate.toLocaleDateString("en-IN")}</td>
                <td data-label="Amount">{formatImsCurrency(Number(bill.amount))}</td>
                <td data-label="GRN ref">{bill.grnReference ?? "—"}</td>
                <td data-label="Status">
                  <span
                    className={`ws-ims-pill ${bill.status === "POSTED" ? "ws-ims-pill-green" : "ws-ims-pill-blue"}`}
                  >
                    {bill.status}
                  </span>
                </td>
                <td data-label="Actions">
                  {bill.status === "DRAFT" ? (
                    <button
                      type="button"
                      className="ws-btn ws-btn-primary ws-btn-small"
                      disabled={pending}
                      onClick={() => post(bill.id)}
                    >
                      Post
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
