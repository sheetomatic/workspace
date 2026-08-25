"use client";

import { useActionState, useState } from "react";
import {
  addClientAddonsAction,
  deleteClientBillingPlanAction,
  removeClientAddonAction,
  updateClientBillingAction,
  type BillingActionState,
} from "@/app/app/clients/actions";
import { formatInrPaise, paiseToRupees } from "@/lib/billing/money";
import type { BillableAddon, WorkspaceAddonCharge } from "@/lib/billing/catalog";

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
  addonLines,
  availableAddons,
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
  addonLines: WorkspaceAddonCharge[];
  availableAddons: BillableAddon[];
}) {
  const [open, setOpen] = useState<"add" | "change" | "addon" | null>(null);
  const [saveState, saveAction, saving] = useActionState(
    updateClientBillingAction,
    initial,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteClientBillingPlanAction,
    initial,
  );
  const [addonState, addonAction, addingAddons] = useActionState(
    addClientAddonsAction,
    initial,
  );
  const [removeAddonState, removeAddonAction, removingAddon] = useActionState(
    removeClientAddonAction,
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
        {availableAddons.length > 0 ? (
          <button
            className="saas-ws-action"
            type="button"
            onClick={() => setOpen(open === "addon" ? null : "addon")}
          >
            Add-On
          </button>
        ) : null}
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
      {addonState.message ? (
        <p className={addonState.ok ? "saas-form-success" : "saas-form-error"}>
          {addonState.message}
        </p>
      ) : null}
      {removeAddonState.message ? (
        <p className={removeAddonState.ok ? "saas-form-success" : "saas-form-error"}>
          {removeAddonState.message}
        </p>
      ) : null}
      {addonLines.length > 0 ? (
        <ul className="ws-addon-lines">
          {addonLines.map((line) => (
            <li key={line.module}>
              <span>
                {line.label}
                {line.amountPaise > 0 ? ` · ${formatInrPaise(line.amountPaise)}` : " · quote"}
              </span>
              <form action={removeAddonAction}>
                <input name="organizationId" type="hidden" value={organizationId} />
                <input name="module" type="hidden" value={line.module} />
                <button className="saas-ws-action danger" disabled={removingAddon} type="submit">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      {open === "addon" ? (
        <form action={addonAction} className="ws-plan-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <p className="ws-addon-form-lead">
            Extra services on this workspace. Next invoice uses the plan rate
            for each one.
          </p>
          {availableAddons.map((addon) => (
            <label key={addon.module} className="ws-addon-option">
              <input name="addon" type="checkbox" value={addon.module} />
              <span>
                {addon.label}
                <small>
                  {addon.amountPaise > 0
                    ? `${formatInrPaise(addon.amountPaise)} / month`
                    : "Custom / quote"}
                </small>
              </span>
            </label>
          ))}
          <div className="ws-billing-actions">
            <button className="btn-cta btn-primary" disabled={addingAddons} type="submit">
              {addingAddons ? "Adding…" : "Add selected"}
            </button>
            <button className="saas-ws-action" type="button" onClick={() => setOpen(null)}>
              Cancel
            </button>
          </div>
        </form>
      ) : null}
      {open === "add" || open === "change" ? (
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
