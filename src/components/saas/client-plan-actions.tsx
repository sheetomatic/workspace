"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  addClientAddonsAction,
  deleteClientBillingPlanAction,
  removeClientAddonAction,
  updateClientAddonBillingAction,
  updateClientBillingAction,
  type BillingActionState,
} from "@/app/app/clients/actions";
import type { WorkspaceAddonCharge } from "@/lib/billing/catalog";
import type { BillableAddon } from "@/lib/billing/catalog";
import { addonRateLabel } from "@/lib/billing/org-addon-billing";
import { formatInrPaise, paiseToRupees } from "@/lib/billing/money";

const initial: BillingActionState = { ok: false, message: "" };

function formatAddonRate(line: Pick<WorkspaceAddonCharge, "ratePaise" | "billingPeriod">) {
  if (line.ratePaise <= 0) {
    return "quote";
  }
  return `${formatInrPaise(line.ratePaise)} / ${addonRateLabel(line.billingPeriod)}`;
}

function AddonLineEditor({
  organizationId,
  line,
  removingAddon,
  removeAddonAction,
}: {
  organizationId: string;
  line: WorkspaceAddonCharge;
  removingAddon: boolean;
  removeAddonAction: (payload: FormData) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editState, editAction, saving] = useActionState(
    updateClientAddonBillingAction,
    initial,
  );

  return (
    <li className="ws-addon-line">
      <div className="ws-addon-line-copy">
        <strong>{line.label}</strong>
        <span className="ws-addon-line-rate">{formatAddonRate(line)}</span>
      </div>
      {editing ? (
        <form action={editAction} className="ws-addon-edit-form">
          <input name="organizationId" type="hidden" value={organizationId} />
          <input name="module" type="hidden" value={line.module} />
          <label>
            Rate (₹)
            <input
              defaultValue={paiseToRupees(line.ratePaise) || ""}
              name="rate"
              required
            />
          </label>
          <label>
            Billed
            <select defaultValue={line.billingPeriod} name="billingPeriod">
              <option value="MONTHLY">Monthly</option>
              <option value="ANNUAL">Annual</option>
            </select>
          </label>
          <div className="ws-form-actions">
            <button
              className="ws-client-action ws-client-action--primary"
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              className="ws-client-action"
              type="button"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
          {editState.message ? (
            <p className={editState.ok ? "saas-form-success" : "saas-form-error"}>
              {editState.message}
            </p>
          ) : null}
        </form>
      ) : (
        <div className="ws-addon-line-actions">
          <button
            className="ws-client-action ws-client-action--compact"
            type="button"
            onClick={() => setEditing(true)}
          >
            Edit
          </button>
          <form action={removeAddonAction}>
            <input name="organizationId" type="hidden" value={organizationId} />
            <input name="module" type="hidden" value={line.module} />
            <button
              className="ws-client-action ws-client-action--compact ws-client-action--danger"
              disabled={removingAddon}
              type="submit"
            >
              {removingAddon ? "Removing…" : "Remove"}
            </button>
          </form>
        </div>
      )}
    </li>
  );
}

export function ClientPlanActions({
  organizationId,
  clientName,
  clientUrl,
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
  clientUrl: string;
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
      {addonLines.length > 0 ? (
        <section className="ws-client-addons">
          <h4>Add-ons</h4>
          <ul className="ws-addon-lines">
            {addonLines.map((line) => (
              <AddonLineEditor
                key={line.module}
                line={line}
                organizationId={organizationId}
                removeAddonAction={removeAddonAction}
                removingAddon={removingAddon}
              />
            ))}
          </ul>
        </section>
      ) : null}
      <div className="ws-client-toolbar">
        <Link className="ws-client-action ws-client-action--link" href={clientUrl}>
          Open client
        </Link>
        {hasPlan ? (
          <button
            className="ws-client-action"
            type="button"
            onClick={() => setOpen(open === "change" ? null : "change")}
          >
            Edit plan
          </button>
        ) : (
          <button
            className="ws-client-action ws-client-action--primary"
            type="button"
            onClick={() => setOpen(open === "add" ? null : "add")}
          >
            Add plan
          </button>
        )}
        {availableAddons.length > 0 || addonLines.length > 0 ? (
          <button
            className="ws-client-action"
            type="button"
            onClick={() => setOpen(open === "addon" ? null : "addon")}
          >
            Add-on
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
            <button
              className="ws-client-action ws-client-action--danger"
              disabled={deleting}
              type="submit"
            >
              {deleting ? "Removing…" : "Remove plan"}
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
      {open === "addon" ? (
        <div className="ws-addon-panel">
          <p className="ws-addon-form-lead">
            Add services with your deal rate. Each add-on can bill monthly or
            annually — independent of the base plan period.
          </p>
          {availableAddons.length > 0 ? (
            <form action={addonAction} className="ws-addon-add-form">
              <input name="organizationId" type="hidden" value={organizationId} />
              {availableAddons.map((addon) => (
                <div key={addon.module} className="ws-addon-card">
                  <label className="ws-addon-option">
                    <input name="addon" type="checkbox" value={addon.module} />
                    <span>
                      {addon.label}
                      <small>
                        Catalog default:{" "}
                        {addon.amountPaise > 0
                          ? `${formatInrPaise(addon.amountPaise)} / month`
                          : "Custom / quote"}
                      </small>
                    </span>
                  </label>
                  <div className="ws-addon-rate-row">
                    <label>
                      Rate (₹)
                      <input
                        defaultValue={paiseToRupees(addon.amountPaise) || ""}
                        name={`rate_${addon.module}`}
                        placeholder="Deal rate"
                      />
                    </label>
                    <label>
                      Billed
                      <select defaultValue="MONTHLY" name={`period_${addon.module}`}>
                        <option value="MONTHLY">Monthly</option>
                        <option value="ANNUAL">Annual</option>
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              <div className="ws-form-actions">
                <button
                  className="ws-client-action ws-client-action--primary"
                  disabled={addingAddons}
                  type="submit"
                >
                  {addingAddons ? "Adding…" : "Add selected"}
                </button>
                <button
                  className="ws-client-action"
                  type="button"
                  onClick={() => setOpen(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <p className="ws-addon-form-lead">All catalog add-ons are already on this client.</p>
          )}
        </div>
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
          <div className="ws-form-actions">
            <button
              className="ws-client-action ws-client-action--primary"
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving…" : open === "add" ? "Add plan" : "Save plan"}
            </button>
            <button
              className="ws-client-action"
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
