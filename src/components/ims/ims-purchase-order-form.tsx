"use client";

import { useActionState } from "react";
import {
  createPurchaseOrderAction,
  updatePurchaseOrderAction,
  type ImsActionState,
} from "@/app/app/ims/actions";

type IndentOption = {
  id: string;
  indentNumber: string;
  siteName: string | null;
  vendor: { id: string; name: string; code: string } | null;
};

export type PurchaseOrderFormValues = {
  purchaseOrderId?: string;
  poNumber?: string;
  indentId?: string | null;
  siteName?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  linesJson?: string;
};

const initial: ImsActionState = { ok: false, message: "" };

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function ImsPurchaseOrderForm({
  indents,
  initialValues,
}: {
  indents: IndentOption[];
  initialValues?: PurchaseOrderFormValues;
}) {
  const isEdit = Boolean(initialValues?.purchaseOrderId);
  const actionFn = isEdit ? updatePurchaseOrderAction : createPurchaseOrderAction;
  const [state, action] = useActionState(actionFn, initial);

  return (
    <form action={action} className="ws-ims-form">
      {isEdit ? (
        <input type="hidden" name="purchaseOrderId" value={initialValues?.purchaseOrderId} />
      ) : null}
      <input
        type="hidden"
        name="lines"
        value={initialValues?.linesJson ?? "[]"}
      />
      <div className="ws-ims-form-grid">
        <label className="ws-ims-form-full">
          From approved indent (optional)
          <select name="indentId" defaultValue={initialValues?.indentId ?? ""}>
            <option value="">Manual PO / pick indent to auto-fill</option>
            {indents.map((indent) => (
              <option key={indent.id} value={indent.id}>
                {indent.indentNumber}
                {indent.vendor ? ` — ${indent.vendor.name}` : ""}
                {indent.siteName ? ` · ${indent.siteName}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label>
          Expected delivery
          <input
            name="expectedDeliveryDate"
            type="date"
            defaultValue={toDateInputValue(initialValues?.expectedDeliveryDate)}
          />
        </label>
        <label>
          Site
          <input
            name="siteName"
            placeholder="Plant / site"
            defaultValue={initialValues?.siteName ?? ""}
          />
        </label>
        <label className="ws-ims-form-full">
          Notes
          <textarea
            name="notes"
            rows={2}
            defaultValue={initialValues?.notes ?? ""}
          />
        </label>
      </div>
      <p className="ws-ims-help">
        {isEdit
          ? `Editing draft ${initialValues?.poNumber ?? "PO"}. Pick an indent to refresh line items, or keep fields as-is and save.`
          : "Selecting an approved indent auto-copies vendor, site, and line quantities with rates."}{" "}
        Purchase orders are store-native — not linked to sales orders.
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
