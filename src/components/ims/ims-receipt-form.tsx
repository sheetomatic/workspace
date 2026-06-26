"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import type { ImsItem } from "@prisma/client";
import {
  recordReceiptAction,
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

type Line = {
  key: string;
  itemId: string;
  quantityOrdered: string;
  quantityReceived: string;
  qcHold: boolean;
};

let lineCounter = 0;
function newLine(itemId = ""): Line {
  lineCounter += 1;
  return {
    key: `line-${lineCounter}`,
    itemId,
    quantityOrdered: "",
    quantityReceived: "",
    qcHold: false,
  };
}

export function ImsReceiptForm({
  items,
  vendorNames = [],
}: {
  items: ItemOption[];
  vendorNames?: string[];
}) {
  const [state, action] = useFormState(recordReceiptAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rawMaterials = useMemo(
    () => items.filter((item) => item.itemType === "RAW_MATERIAL"),
    [items],
  );

  const [lines, setLines] = useState<Line[]>([newLine(rawMaterials[0]?.id ?? "")]);
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset upload + lines after a successful server action
      setUpload({ status: "idle" });
      setLines([newLine(rawMaterials[0]?.id ?? "")]);
    }
  }, [state, rawMaterials]);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((current) => [...current, newLine(rawMaterials[0]?.id ?? "")]);
  }

  function removeLine(key: string) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((line) => line.key !== key),
    );
  }

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
      const res = await fetch("/api/ims/attachments", { method: "POST", body });
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

  const linesPayload = JSON.stringify(
    lines
      .filter((line) => line.itemId && line.quantityReceived)
      .map((line) => ({
        itemId: line.itemId,
        quantityReceived: line.quantityReceived,
        quantityOrdered: line.quantityOrdered,
        qcHold: line.qcHold,
      })),
  );

  const hasValidLine = lines.some((line) => line.itemId && line.quantityReceived);

  if (rawMaterials.length === 0) {
    return (
      <div className="ws-ims-receipt-head">
        <h3>Receive raw material (GRN)</h3>
        <p className="ws-ims-help">
          No raw materials defined yet. <Link href="/app/ims/items">Add an item</Link>{" "}
          (type: Raw material) to start receiving stock.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="ws-ims-form ws-ims-receipt">
      <input type="hidden" name="lines" value={linesPayload} />
      {upload.status === "done" ? (
        <input type="hidden" name="attachmentId" value={upload.id} />
      ) : null}

      <div className="ws-ims-receipt-head">
        <h3>Receive raw material (GRN)</h3>
        <p className="ws-ims-help">
          Add one or more items received in this delivery, then record the shared PO and
          invoice details once.
        </p>
      </div>

      <fieldset className="ws-ims-fieldset">
        <legend>Items received</legend>

        <div className="ws-ims-line-head">
          <span>Item</span>
          <span>Ordered</span>
          <span>Received</span>
          <span>QC</span>
          <span />
        </div>

        <div className="ws-ims-line-list">
          {lines.map((line, index) => {
            const selected = rawMaterials.find((item) => item.id === line.itemId);
            const policy = selected?.qcOnReceipt;
            return (
              <div key={line.key} className="ws-ims-line">
                <label className="ws-ims-line-field" data-col="item">
                  <span className="ws-ims-line-label">Item {index + 1}</span>
                  <select
                    value={line.itemId}
                    onChange={(event) =>
                      updateLine(line.key, { itemId: event.target.value })
                    }
                  >
                    {rawMaterials.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="ws-ims-line-field" data-col="ordered">
                  <span className="ws-ims-line-label">Ordered</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={selected?.uom ?? "qty"}
                    value={line.quantityOrdered}
                    onChange={(event) =>
                      updateLine(line.key, { quantityOrdered: event.target.value })
                    }
                  />
                </label>
                <label className="ws-ims-line-field" data-col="received">
                  <span className="ws-ims-line-label">Received</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder={selected?.uom ?? "qty"}
                    value={line.quantityReceived}
                    onChange={(event) =>
                      updateLine(line.key, { quantityReceived: event.target.value })
                    }
                  />
                </label>
                <div className="ws-ims-line-field" data-col="qc">
                  <span className="ws-ims-line-label">QC</span>
                  {policy === "OPTIONAL" ? (
                    <label className="ws-ims-line-qc">
                      <input
                        type="checkbox"
                        checked={line.qcHold}
                        onChange={(event) =>
                          updateLine(line.key, { qcHold: event.target.checked })
                        }
                      />
                      Hold
                    </label>
                  ) : policy === "ALWAYS" ? (
                    <span className="ws-ims-line-tag">Always</span>
                  ) : (
                    <span className="ws-ims-line-tag ws-ims-line-tag-muted">Off</span>
                  )}
                </div>
                <div className="ws-ims-line-field" data-col="remove">
                  <span className="ws-ims-line-label" />
                  <button
                    type="button"
                    className="ws-ims-line-remove"
                    onClick={() => removeLine(line.key)}
                    disabled={lines.length === 1}
                    aria-label="Remove line"
                  >
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="ws-ims-line-actions">
          <button type="button" className="ws-btn-secondary" onClick={addLine}>
            + Add item
          </button>
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
            <input
              name="supplierName"
              type="text"
              placeholder="Supplier name"
              list={vendorNames.length > 0 ? "ims-vendor-names" : undefined}
            />
            {vendorNames.length > 0 ? (
              <datalist id="ims-vendor-names">
                {vendorNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            ) : null}
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
          disabled={!hasValidLine || upload.status === "uploading"}
        >
          Record receipt
        </button>
      </div>
    </form>
  );
}
