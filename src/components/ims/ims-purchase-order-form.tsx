"use client";

import { useEffect, useRef, useState } from "react";
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

type VendorOption = { id: string; name: string; code: string };
type ItemOption = { id: string; code: string; name: string; uom: string };

export type PurchaseOrderFormValues = {
  purchaseOrderId?: string;
  poNumber?: string;
  indentId?: string | null;
  vendorId?: string | null;
  siteName?: string | null;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  linesJson?: string;
};

type Line = {
  key: string;
  itemId: string;
  quantity: string;
  rate: string;
  notes: string;
};

const initial: ImsActionState = { ok: false, message: "" };

let lineCounter = 0;
function newLine(itemId = "", quantity = "", rate = "", notes = ""): Line {
  lineCounter += 1;
  return {
    key: `line-${lineCounter}`,
    itemId,
    quantity,
    rate,
    notes,
  };
}

function parseInitialLines(linesJson?: string, fallbackItemId = ""): Line[] {
  if (!linesJson) return [newLine(fallbackItemId)];
  try {
    const parsed = JSON.parse(linesJson) as Array<{
      itemId?: string;
      quantity?: number;
      rate?: number;
      notes?: string;
    }>;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [newLine(fallbackItemId)];
    }
    return parsed.map((line) =>
      newLine(
        line.itemId ?? "",
        line.quantity != null ? String(line.quantity) : "",
        line.rate != null ? String(line.rate) : "",
        line.notes ?? "",
      ),
    );
  } catch {
    return [newLine(fallbackItemId)];
  }
}

function toDateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function ImsPurchaseOrderForm({
  indents,
  vendors,
  items,
  initialValues,
}: {
  indents: IndentOption[];
  vendors: VendorOption[];
  items: ItemOption[];
  initialValues?: PurchaseOrderFormValues;
}) {
  const isEdit = Boolean(initialValues?.purchaseOrderId);
  const actionFn = isEdit ? updatePurchaseOrderAction : createPurchaseOrderAction;
  const [state, action] = useActionState(actionFn, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [indentId, setIndentId] = useState(initialValues?.indentId ?? "");
  const [vendorId, setVendorId] = useState(initialValues?.vendorId ?? "");
  const [siteName, setSiteName] = useState(initialValues?.siteName ?? "");
  const [lines, setLines] = useState<Line[]>(() =>
    parseInitialLines(initialValues?.linesJson, items[0]?.id ?? ""),
  );

  useEffect(() => {
    if (state.ok && !isEdit) {
      formRef.current?.reset();
      setIndentId("");
      setVendorId("");
      setSiteName("");
      setLines([newLine(items[0]?.id ?? "")]);
    }
  }, [state, isEdit, items]);

  function onIndentChange(nextIndentId: string) {
    setIndentId(nextIndentId);
    if (!nextIndentId) return;
    const indent = indents.find((row) => row.id === nextIndentId);
    if (!indent) return;
    if (indent.vendor?.id) setVendorId(indent.vendor.id);
    if (indent.siteName) setSiteName(indent.siteName);
  }

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((current) => [...current, newLine(items[0]?.id ?? "")]);
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length <= 1 ? current : current.filter((line) => line.key !== key),
    );
  }

  const linesJson = JSON.stringify(
    lines
      .filter((line) => line.itemId && line.quantity)
      .map((line) => ({
        itemId: line.itemId,
        quantity: Number.parseFloat(line.quantity),
        rate: line.rate ? Number.parseFloat(line.rate) : undefined,
        notes: line.notes || undefined,
      })),
  );

  return (
    <form ref={formRef} action={action} className="ws-ims-form">
      {isEdit ? (
        <input type="hidden" name="purchaseOrderId" value={initialValues?.purchaseOrderId} />
      ) : null}
      <input type="hidden" name="lines" value={linesJson} />
      <div className="ws-ims-form-grid">
        <label className="ws-ims-form-full">
          Link approved indent (optional)
          <select
            name="indentId"
            value={indentId}
            onChange={(e) => onIndentChange(e.target.value)}
          >
            <option value="">Create without indent (independent PO)</option>
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
          Vendor
          <select
            name="vendorId"
            value={vendorId}
            onChange={(e) => setVendorId(e.target.value)}
            required={!indentId}
          >
            <option value="">Select vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.code} — {vendor.name}
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
            value={siteName}
            onChange={(e) => setSiteName(e.target.value)}
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

      <h3>Line items</h3>
      {indentId ? (
        <p className="ws-ims-help">
          Linked indent will auto-copy lines on save if you leave quantities blank below.
          Or enter lines manually to override.
        </p>
      ) : (
        <p className="ws-ims-help">
          Independent PO — pick vendor and add item lines with quantity and rate.
        </p>
      )}
      <div className="ws-ims-receipt-lines">
        {lines.map((line) => (
          <div key={line.key} className="ws-ims-receipt-line">
            <label>
              Item
              <select
                value={line.itemId}
                onChange={(e) => updateLine(line.key, { itemId: e.target.value })}
                required={!indentId}
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Qty
              <input
                type="number"
                min="0.001"
                step="any"
                value={line.quantity}
                onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                required={!indentId}
              />
            </label>
            <label>
              Rate
              <input
                type="number"
                min="0"
                step="any"
                value={line.rate}
                onChange={(e) => updateLine(line.key, { rate: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <label>
              Line notes
              <input
                value={line.notes}
                onChange={(e) => updateLine(line.key, { notes: e.target.value })}
                placeholder="Optional"
              />
            </label>
            <button
              type="button"
              className="ws-btn ws-btn-ghost"
              onClick={() => removeLine(line.key)}
              disabled={lines.length <= 1}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button type="button" className="ws-btn ws-btn-ghost" onClick={addLine}>
        Add line
      </button>

      <p className="ws-ims-help">
        {isEdit
          ? `Editing draft ${initialValues?.poNumber ?? "PO"}. Link an indent to refresh lines, or keep independent lines and save.`
          : "Create an independent vendor PO, or optionally link an approved indent to auto-fill vendor, site, and lines."}{" "}
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
