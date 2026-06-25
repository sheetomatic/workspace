"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import type { ImsItem } from "@prisma/client";
import {
  recordMovementAction,
  type ImsActionState,
} from "@/app/app/ims/actions";

type ItemOption = Pick<
  ImsItem,
  "id" | "code" | "name" | "itemType" | "qcOnReceipt" | "uom"
>;

const initial: ImsActionState = { ok: false, message: "" };

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "done"; id: string; fileName: string }
  | { status: "error"; message: string };

export function ImsReceiptForm({ items }: { items: ItemOption[] }) {
  const [state, action] = useFormState(recordMovementAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rawMaterials = useMemo(
    () => items.filter((item) => item.itemType === "RAW_MATERIAL"),
    [items],
  );
  const [itemId, setItemId] = useState(rawMaterials[0]?.id ?? "");
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });

  const selected = rawMaterials.find((item) => item.id === itemId);
  const showQcPrompt = selected?.qcOnReceipt === "OPTIONAL";

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setUpload({ status: "idle" });
      setItemId(rawMaterials[0]?.id ?? "");
    }
  }, [state, rawMaterials]);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      setUpload({ status: "idle" });
      return;
    }
    setUpload({ status: "uploading" });
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await fetch("/api/ims/attachments", {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        attachment?: { id: string; fileName: string };
        error?: string;
      };
      if (!res.ok || !data.attachment) {
        setUpload({ status: "error", message: data.error ?? "Upload failed." });
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setUpload({
        status: "done",
        id: data.attachment.id,
        fileName: data.attachment.fileName,
      });
    } catch {
      setUpload({ status: "error", message: "Network error during upload." });
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function clearUpload() {
    setUpload({ status: "idle" });
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <form ref={formRef} action={action} className="ws-ims-form ws-ims-receipt">
      <input type="hidden" name="movementType" value="RM_IN" />
      {upload.status === "done" ? (
        <input type="hidden" name="attachmentId" value={upload.id} />
      ) : null}

      <div className="ws-ims-receipt-head">
        <h3>Receive raw material (GRN)</h3>
        <p className="ws-ims-help">
          Record an inbound receipt against a purchase order and attach the supplier
          invoice.
        </p>
      </div>

      <fieldset className="ws-ims-fieldset">
        <legend>Item &amp; quantity</legend>
        <div className="ws-ims-form-grid">
          <label>
            Item
            <select
              name="itemId"
              required
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
            >
              {rawMaterials.length === 0 ? (
                <option value="">No raw materials available</option>
              ) : (
                rawMaterials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} - {item.name}
                  </option>
                ))
              )}
            </select>
          </label>
          <label>
            Quantity ordered
            <input
              name="quantityOrdered"
              type="number"
              min="0"
              step="any"
              placeholder={selected?.uom ?? "qty"}
            />
          </label>
          <label>
            Quantity received
            <input
              name="quantity"
              type="number"
              min="0.0001"
              step="any"
              required
              placeholder={selected?.uom ?? "qty"}
            />
          </label>
        </div>
      </fieldset>

      <fieldset className="ws-ims-fieldset">
        <legend>Purchase order &amp; supplier</legend>
        <div className="ws-ims-form-grid">
          <label>
            PO number
            <input name="poNumber" type="text" placeholder="PO-0001" />
          </label>
          <label>
            Supplier / vendor
            <input name="supplierName" type="text" placeholder="Supplier name" />
          </label>
          <label>
            GRN / challan reference
            <input name="reference" type="text" placeholder="GRN or delivery note" />
          </label>
        </div>
      </fieldset>

      <fieldset className="ws-ims-fieldset">
        <legend>Invoice</legend>
        <div className="ws-ims-form-grid">
          <label>
            Invoice number
            <input name="invoiceNumber" type="text" placeholder="INV-0001" />
          </label>
          <label>
            Invoice date
            <input name="invoiceDate" type="date" />
          </label>
          <label>
            Invoice amount (INR)
            <input name="invoiceAmount" type="number" min="0" step="any" />
          </label>
        </div>

        <div className="ws-ims-upload">
          <label className="ws-ims-upload-label">
            Invoice file (PDF / image, max 4 MB)
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
            />
          </label>
          {upload.status === "uploading" ? (
            <span className="ws-ims-upload-status">Uploading...</span>
          ) : null}
          {upload.status === "done" ? (
            <span className="ws-ims-upload-status ws-ims-upload-done">
              Attached: {upload.fileName}
              <button type="button" onClick={clearUpload}>
                Remove
              </button>
            </span>
          ) : null}
          {upload.status === "error" ? (
            <span className="ws-ims-upload-status ws-ims-upload-error">
              {upload.message}
            </span>
          ) : null}
        </div>
      </fieldset>

      <label>
        Notes
        <textarea name="notes" rows={2} placeholder="Condition notes, discrepancies, etc." />
      </label>

      {selected?.qcOnReceipt === "ALWAYS" ? (
        <p className="ws-ims-help">
          QC is always required for this item - stock goes to QC pending.
        </p>
      ) : null}
      {selected?.qcOnReceipt === "OFF" ? (
        <p className="ws-ims-help">QC is off - stock goes directly to usable.</p>
      ) : null}
      {showQcPrompt ? (
        <label className="ws-ims-checkbox">
          <input name="qcRequired" type="checkbox" value="yes" />
          Hold this receipt for QC inspection?
        </label>
      ) : null}

      {state.message ? (
        <p
          className={
            state.ok ? "ws-ims-feedback" : "ws-ims-feedback ws-ims-feedback-error"
          }
        >
          {state.message}
        </p>
      ) : null}

      <div className="ws-ims-form-actions">
        <button
          type="submit"
          className="ws-btn-primary"
          disabled={!itemId || upload.status === "uploading"}
        >
          Record receipt
        </button>
      </div>
    </form>
  );
}
