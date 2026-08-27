"use client";

import { useActionState, useState } from "react";
import { Check, Loader2, PackagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
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
      <div className="ws-addon-line-main">
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
          <div className="ws-wa-icon-row">
            <button
              className={`ws-billing-icon-btn${saving ? " is-busy" : ""}`}
              disabled={saving}
              type="submit"
              title="Save add-on rate"
              aria-label="Save add-on rate"
            >
              {saving ? <Loader2 size={16} aria-hidden /> : <Check size={16} aria-hidden />}
            </button>
            <button
              className="ws-billing-icon-btn"
              type="button"
              title="Cancel"
              aria-label="Cancel"
              onClick={() => setEditing(false)}
            >
              <X size={16} aria-hidden />
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
            className="ws-billing-icon-btn"
            type="button"
            title="Edit add-on rate"
            aria-label={`Edit ${line.label} rate`}
            onClick={() => setEditing(true)}
          >
            <Pencil size={16} aria-hidden />
          </button>
          <form action={removeAddonAction}>
            <input name="organizationId" type="hidden" value={organizationId} />
            <input name="module" type="hidden" value={line.module} />
            <button
              className={`ws-billing-icon-btn danger${removingAddon ? " is-busy" : ""}`}
              disabled={removingAddon}
              type="submit"
              title="Remove add-on"
              aria-label={`Remove ${line.label}`}
            >
              {removingAddon ? <Loader2 size={16} aria-hidden /> : <X size={16} aria-hidden />}
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
      <div className="ws-wa-icon-row">
        {hasPlan ? (
          <button
            className="ws-billing-icon-btn"
            type="button"
            title="Change plan"
            aria-label="Change plan"
            onClick={() => setOpen(open === "change" ? null : "change")}
          >
            <Pencil size={16} aria-hidden />
          </button>
        ) : (
          <button
            className="ws-billing-icon-btn"
            type="button"
            title="Add plan"
            aria-label="Add plan"
            onClick={() => setOpen(open === "add" ? null : "add")}
          >
            <Plus size={16} aria-hidden />
          </button>
        )}
        {availableAddons.length > 0 || addonLines.length > 0 ? (
          <button
            className="ws-billing-icon-btn"
            type="button"
            title="Add-on"
            aria-label="Add-on"
            onClick={() => setOpen(open === "addon" ? null : "addon")}
          >
            <PackagePlus size={16} aria-hidden />
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
              className={`ws-billing-icon-btn danger${deleting ? " is-busy" : ""}`}
              disabled={deleting}
              type="submit"
              title="Remove plan"
              aria-label="Remove plan"
            >
              {deleting ? (
                <Loader2 size={16} aria-hidden />
              ) : (
                <Trash2 size={16} aria-hidden />
              )}
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
            <AddonLineEditor
              key={line.module}
              line={line}
              organizationId={organizationId}
              removeAddonAction={removeAddonAction}
              removingAddon={removingAddon}
            />
          ))}
        </ul>
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
              <div className="ws-wa-icon-row">
                <button
                  className={`ws-billing-icon-btn${addingAddons ? " is-busy" : ""}`}
                  disabled={addingAddons}
                  type="submit"
                  title="Add selected add-ons"
                  aria-label="Add selected add-ons"
                >
                  {addingAddons ? (
                    <Loader2 size={16} aria-hidden />
                  ) : (
                    <Check size={16} aria-hidden />
                  )}
                </button>
                <button
                  className="ws-billing-icon-btn"
                  type="button"
                  title="Cancel"
                  aria-label="Cancel"
                  onClick={() => setOpen(null)}
                >
                  <X size={16} aria-hidden />
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
          <div className="ws-wa-icon-row">
            <button
              className={`ws-billing-icon-btn${saving ? " is-busy" : ""}`}
              disabled={saving}
              type="submit"
              title={open === "add" ? "Add plan" : "Save plan"}
              aria-label={open === "add" ? "Add plan" : "Save plan"}
            >
              {saving ? (
                <Loader2 size={16} aria-hidden />
              ) : (
                <Check size={16} aria-hidden />
              )}
            </button>
            <button
              className="ws-billing-icon-btn"
              type="button"
              title="Cancel"
              aria-label="Cancel"
              onClick={() => setOpen(null)}
            >
              <X size={16} aria-hidden />
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
