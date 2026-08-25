"use client";

import { useActionState, useState } from "react";
import {
  deleteClientBillingPlanAction,
  updateClientBillingAction,
  type BillingActionState,
} from "@/app/app/clients/actions";
import { paiseToRupees } from "@/lib/billing/money";

const initial: BillingActionState = { ok: false, message: "" };

export function ClientPlanActions({
  organizationId,
  clientName,
  hasPlan,
  monthlyPaise,
  extraUserMonthlyPaise,
  includedUsers,
  gstPercent,
  billingPeriod,
  renewalAt,
}: {
  organizationId: string;
  clientName: string;
  hasPlan: boolean;
  monthlyPaise: number;
  extraUserMonthlyPaise: number;
  includedUsers: number;
  gstPercent: number;
  billingPeriod: string;
  renewalAt: string;
}) {
  const [open, setOpen] = useState<"add" | "change" | null>(null);
  const [saveState, saveAction, saving] = useActionState(
    updateClientBillingAction,
    initial,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteClientBillingPlanAction,
    initial,
  );

  return (
    <div className="ws-plan-actions">
      <div className="ws-billing-actions">
        {hasPlan ? (
          <button
            className="saas-ws-action"
            type="button"
            onClick={() => setOpen(open === "change" ? null : "change")}
          >
            Change
          </button>
        ) : (
          <button
            className="saas-ws-action"
            type="button"
            onClick={() => setOpen(open === "add" ? null : "add")}
          >
            Add plan
          </button>
        )}
        {hasPlan ? (
          <form
            action={deleteAction}
            onSubmit={(event) => {
              if (
                !window.confirm(
                  `Remove the billing plan for ${clientName}? Existing invoices stay.`,
                )
              ) {
                event.preventDefault();
              }
            }}
          >
            <input name="organizationId" type="hidden" value={organizationId} />
            <button className="saas-ws-action danger" disabled={deleting} type="submit">
              {deleting ? "Removing…" : "Delete"}
            </button>
          </form>
        ) : null}
      </div>
      {deleteState.message ? (
        <p className={deleteState.ok ? "saas-form-success" : "saas-form-error"}>
          {deleteState.message}
        </p>
      ) : null}
      {open ? (
        <form action={saveAction} className="ws-plan-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <label>
            Monthly (₹)
            <input
              defaultValue={paiseToRupees(monthlyPaise) || ""}
              name="monthlyRate"
              required
            />
          </label>
          <label>
            Extra user (₹)
            <input
              defaultValue={paiseToRupees(extraUserMonthlyPaise) || ""}
              name="extraUserRate"
            />
          </label>
          <label>
            Included users
            <input
              defaultValue={includedUsers}
              min={0}
              name="includedUsers"
              type="number"
            />
          </label>
          <label>
            GST %
            <input
              defaultValue={gstPercent}
              max={40}
              min={0}
              name="gstPercent"
              type="number"
            />
          </label>
          <label>
            Period
            <select defaultValue={billingPeriod} name="billingPeriod">
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </label>
          <label>
            Renewal
            <input defaultValue={renewalAt} name="renewalAt" type="date" />
          </label>
          <div className="ws-billing-actions">
            <button className="btn-cta btn-primary" disabled={saving} type="submit">
              {saving ? "Saving…" : open === "add" ? "Add plan" : "Save plan"}
            </button>
            <button
              className="saas-ws-action"
              type="button"
              onClick={() => setOpen(null)}
            >
              Cancel
            </button>
          </div>
          {saveState.message ? (
            <p className={saveState.ok ? "saas-form-success" : "saas-form-error"}>
              {saveState.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </div>
  );
}
