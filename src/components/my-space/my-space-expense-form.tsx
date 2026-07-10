"use client";

import { useActionState } from "react";
import type { OrgExpenseCategory } from "@prisma/client";
import {
  createOrgExpenseAction,
  type MySpaceActionState,
} from "@/app/app/my-space/actions";
import {
  ORG_EXPENSE_CATEGORY_GROUPS,
  ORG_EXPENSE_CATEGORY_LABELS,
} from "@/lib/my-space/expense-labels";

const initial: MySpaceActionState = { ok: false, message: "" };

export function MySpaceExpenseForm({
  defaultCategory,
}: {
  defaultCategory?: OrgExpenseCategory;
}) {
  const [state, action] = useActionState(createOrgExpenseAction, initial);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="ws-ims-form">
      <div className="ws-ims-form-grid">
        <label className="ws-ims-form-full">
          Category
          <select name="category" defaultValue={defaultCategory ?? "API_CURSOR"} required>
            {ORG_EXPENSE_CATEGORY_GROUPS.map((group) => (
              <optgroup key={group.title} label={group.title}>
                {group.categories.map((category) => (
                  <option key={category} value={category}>
                    {ORG_EXPENSE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="ws-ims-form-full">
          Title
          <input name="title" required placeholder="e.g. Cursor Pro · July" />
        </label>
        <label>
          Amount (₹)
          <input name="amount" type="number" min="0" step="0.01" required placeholder="0" />
        </label>
        <label>
          Date
          <input name="expenseDate" type="date" defaultValue={today} required />
        </label>
        <label>
          Recurrence
          <select name="recurrence" defaultValue="MONTHLY">
            <option value="ONE_TIME">One-time</option>
            <option value="MONTHLY">Monthly</option>
          </select>
        </label>
        <label>
          Qty (active numbers)
          <input
            name="quantity"
            type="number"
            min="0"
            step="1"
            placeholder="For phone plans"
          />
        </label>
        <label>
          Vendor / provider
          <input name="vendor" placeholder="Optional" />
        </label>
        <label className="ws-ims-form-full">
          Notes
          <textarea name="notes" rows={2} placeholder="Optional" />
        </label>
      </div>
      <div className="ws-ims-form-actions">
        <button type="submit" className="ws-btn ws-btn-primary">
          Add expense
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "ws-ims-success" : "ws-ims-error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
