"use client";

import { useActionState } from "react";
import { createIndentAction, type ImsActionState } from "@/app/app/ims/actions";

type RequisitionOption = {
  id: string;
  requisitionNumber: string;
  siteName: string | null;
  lines: Array<{
    itemId: string;
    quantityApproved: unknown;
    quantityRequested: unknown;
    item: { id: string; code: string; name: string; uom: string };
  }>;
};

type VendorOption = { id: string; name: string; code: string };

const initial: ImsActionState = { ok: false, message: "" };

export function ImsIndentForm({
  requisitions,
  vendors,
}: {
  requisitions: RequisitionOption[];
  vendors: VendorOption[];
}) {
  const [state, action] = useActionState(createIndentAction, initial);

  return (
    <form action={action} className="ws-ims-form">
      <label>
        From approved MR (optional)
        <select name="requisitionId" defaultValue="">
          <option value="">Manual lines / pick MR to auto-fill</option>
          {requisitions.map((req) => (
            <option key={req.id} value={req.id}>
              {req.requisitionNumber}
              {req.siteName ? ` — ${req.siteName}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label>
        Vendor (optional)
        <select name="vendorId" defaultValue="">
          <option value="">Select vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.code} — {vendor.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Site
        <input name="siteName" placeholder="Plant / site" />
      </label>
      <label>
        Notes
        <textarea name="notes" rows={2} />
      </label>
      <input type="hidden" name="lines" value="[]" />
      <p className="ws-ims-help">
        Selecting an approved MR auto-copies approved line quantities on save. Add manual line
        support in a follow-up if needed.
      </p>
      <div className="ws-ims-form-actions">
        <button type="submit" name="submit" value="false" className="ws-btn ws-btn-secondary">
          Save draft
        </button>
        <button type="submit" name="submit" value="true" className="ws-btn ws-btn-primary">
          Submit for approval
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "ws-ims-success" : "ws-ims-error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
