"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { OrgExpenseCategory, OrgExpenseRecurrence } from "@prisma/client";
import { deleteOrgExpenseAction } from "@/app/app/my-space/actions";
import { ORG_EXPENSE_CATEGORY_LABELS } from "@/lib/my-space/expense-labels";
import { formatInr } from "@/lib/leads/categories";

export type ExpenseListRow = {
  id: string;
  category: OrgExpenseCategory;
  title: string;
  amount: number;
  expenseDate: Date;
  recurrence: OrgExpenseRecurrence;
  quantity: number | null;
  vendor: string | null;
  notes: string | null;
};

export function MySpaceExpenseList({ expenses }: { expenses: ExpenseListRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteOrgExpenseAction(id);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  if (expenses.length === 0) {
    return (
      <p className="ws-apple-record-empty">
        No expenses yet. Add Cursor, OpenAI, WhatsApp, rent, fuel, and more.
      </p>
    );
  }

  return (
    <>
      {message ? <p className="ws-ims-help">{message}</p> : null}
      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-apple-data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Category</th>
              <th>Title</th>
              <th>Amount</th>
              <th>Plan</th>
              <th>Qty</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {expenses.map((row) => (
              <tr key={row.id}>
                <td className="ws-apple-cell-secondary">
                  {row.expenseDate.toLocaleDateString("en-IN")}
                </td>
                <td className="ws-apple-cell-secondary">
                  {ORG_EXPENSE_CATEGORY_LABELS[row.category]}
                </td>
                <td>
                  <span className="ws-apple-cell-primary">{row.title}</span>
                  {row.vendor ? (
                    <div className="ws-apple-cell-secondary">{row.vendor}</div>
                  ) : null}
                </td>
                <td className="ws-apple-cell-primary">{formatInr(row.amount)}</td>
                <td className="ws-apple-cell-secondary">
                  {row.recurrence === "MONTHLY" ? "Monthly" : "One-time"}
                </td>
                <td className="ws-apple-cell-secondary">{row.quantity ?? "—"}</td>
                <td>
                  <button
                    type="button"
                    className="ws-btn ws-btn-ghost ws-btn-small"
                    disabled={pending}
                    onClick={() => remove(row.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
