"use client";

import { useActionState, useState } from "react";
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
  const [category, setCategory] = useState<OrgExpenseCategory>(
    defaultCategory ?? "API_CURSOR",
  );
  const today = new Date().toISOString().slice(0, 10);
  const isEmi = category === "EMI";
  const isPhonePlan = category === "PHONE_NUMBERS_PLAN";

  return (
    <form action={action} className="ws-ims-form">
      <div className="ws-ims-form-grid">
        <label className="ws-ims-form-full">
          Category
          <select
            name="category"
            value={category}
            required
            onChange={(event) => setCategory(event.target.value as OrgExpenseCategory)}
          >
            {ORG_EXPENSE_CATEGORY_GROUPS.map((group) => (
              <optgroup key={group.title} label={group.title}>
                {group.categories.map((item) => (
                  <option key={item} value={item}>
                    {ORG_EXPENSE_CATEGORY_LABELS[item]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
        <label className="ws-ims-form-full">
          {isPhonePlan ? "Plan name" : "Title"}
          <input
            name="title"
            required
            placeholder={
              isPhonePlan
                ? "e.g. Jio Business · Unlimited"
                : isEmi
                  ? "e.g. HDFC Car EMI"
                  : "e.g. Cursor Pro · July"
            }
          />
        </label>
        <label>
          {isEmi ? "EMI amount (₹)" : isPhonePlan ? "Plan amount (₹)" : "Amount (₹)"}
          <input name="amount" type="number" min="0" step="0.01" required placeholder="0" />
        </label>
        <label>
          Date
          <input name="expenseDate" type="date" defaultValue={today} required />
        </label>
        <label>
          Type
          <select name="recurrence" defaultValue="MONTHLY">
            <option value="MONTHLY">Fixed expense (monthly)</option>
            <option value="ONE_TIME">One-time</option>
          </select>
        </label>
        {isEmi ? (
          <label>
            Asset under EMI
            <input
              name="assetLabel"
              required
              placeholder="Car, Home, Laptop…"
            />
          </label>
        ) : (
          <input type="hidden" name="assetLabel" value="" />
        )}
        {isPhonePlan ? (
          <label>
            Active numbers
            <input
              name="quantity"
              type="number"
              min="1"
              step="1"
              required
              placeholder="e.g. 12"
            />
          </label>
        ) : (
          <input type="hidden" name="quantity" value="" />
        )}
        <label className={isPhonePlan || isEmi ? undefined : "ws-ims-form-full"}>
          {isPhonePlan ? "Provider" : "Vendor / provider"}
          <input
            name="vendor"
            placeholder={isPhonePlan ? "Jio, Airtel, VI…" : "Optional"}
          />
        </label>
        <label className="ws-ims-form-full">
          Notes
          <textarea name="notes" rows={2} placeholder="Optional" />
        </label>
      </div>
      <p className="ws-ims-help">
        Fixed expenses repeat every month (rent, EMI, plans). One-time is for ad-hoc spends.
      </p>
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
