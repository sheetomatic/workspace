"use client";

import { useActionState } from "react";
import { createPurchaseBillAction, type ImsActionState } from "@/app/app/ims/actions";

type VendorOption = { id: string; name: string; code: string };

const initial: ImsActionState = { ok: false, message: "" };

export function ImsPurchaseBillForm({ vendors }: { vendors: VendorOption[] }) {
  const [state, action] = useActionState(createPurchaseBillAction, initial);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <form action={action} className="ws-ims-form">
      <label>
        Vendor
        <select name="vendorId" required>
          <option value="">Select vendor</option>
          {vendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.code} — {vendor.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Bill date
        <input type="date" name="billDate" defaultValue={today} required />
      </label>
      <label>
        Amount (₹)
        <input type="number" name="amount" min="0.01" step="0.01" required />
      </label>
      <label>
        GRN reference
        <input name="grnReference" placeholder="GRN / receipt ref" />
      </label>
      <label>
        Vendor invoice #
        <input name="invoiceNumber" />
      </label>
      <label>
        Notes
        <textarea name="notes" rows={2} />
      </label>
      <div className="ws-ims-form-actions">
        <button type="submit" name="post" value="false" className="ws-btn ws-btn-secondary">
          Save draft
        </button>
        <button type="submit" name="post" value="true" className="ws-btn ws-btn-primary">
          Save & post
        </button>
      </div>
      {state.message ? (
        <p className={state.ok ? "ws-ims-success" : "ws-ims-error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
