"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useFormState } from "react-dom";
import type { ImsItem, ImsMovementType } from "@prisma/client";
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

const MOVEMENT_LABELS: Record<ImsMovementType, string> = {
  RM_IN: "RM In",
  ISSUE_TO_PRODUCTION: "Issue to production",
  FG_IN: "FG In",
  FG_OUT: "FG Out",
  QC_PASS: "QC pass",
  QC_FAIL: "QC fail",
  ADJUSTMENT: "Adjustment",
};

function itemsForMovement(items: ItemOption[], movementType: ImsMovementType) {
  switch (movementType) {
    case "RM_IN":
    case "ISSUE_TO_PRODUCTION":
      return items.filter((item) => item.itemType === "RAW_MATERIAL");
    case "FG_IN":
    case "FG_OUT":
      return items.filter((item) => item.itemType === "FINISHED_GOOD");
    default:
      return items;
  }
}

export function ImsMovementForm({
  items,
  movementType,
  usableMap,
  vendorNames = [],
}: {
  items: ItemOption[];
  movementType: ImsMovementType;
  usableMap?: Record<string, number>;
  vendorNames?: string[];
}) {
  const [state, action] = useFormState(recordMovementAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(
    () => itemsForMovement(items, movementType),
    [items, movementType],
  );
  const [itemId, setItemId] = useState(filtered[0]?.id ?? "");
  const [upload, setUpload] = useState<UploadState>({ status: "idle" });
  const selected = filtered.find((item) => item.id === itemId);
  const isReceipt = movementType === "RM_IN" || movementType === "FG_IN";
  const isIssue =
    movementType === "ISSUE_TO_PRODUCTION" || movementType === "FG_OUT";
  const showQcPrompt = isReceipt && selected?.qcOnReceipt === "OPTIONAL";
  const available = selected ? usableMap?.[selected.id] ?? 0 : 0;
  const datalistId = `ims-mv-vendors-${movementType}`;

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset upload chip after a successful server action
      setUpload({ status: "idle" });
    }
  }, [state]);

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

  return (
    <form ref={formRef} action={action} className="ws-ims-form">
      <input type="hidden" name="movementType" value={movementType} />
      {upload.status === "done" ? (
        <input type="hidden" name="attachmentId" value={upload.id} />
      ) : null}
      <h3>{MOVEMENT_LABELS[movementType]}</h3>

      <label>
        Item
        <select
          name="itemId"
          required
          value={itemId}
          onChange={(event) => setItemId(event.target.value)}
        >
          {filtered.length === 0 ? (
            <option value="">No items available</option>
          ) : (
            filtered.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.name}
              </option>
            ))
          )}
        </select>
      </label>

      {isIssue && selected ? (
        <p className="ws-ims-help">
          Available: {available.toLocaleString("en-IN")} {selected.uom}
        </p>
      ) : null}

      <label>
        Quantity
        <input
          name="quantity"
          type="number"
          min="0.0001"
          step="any"
          required
          placeholder={selected?.uom ?? "qty"}
        />
      </label>

      <label>
        Reference
        <input name="reference" type="text" placeholder="GRN / challan / SO no." />
      </label>

      <label>
        Notes
        <textarea name="notes" rows={2} placeholder="Optional notes" />
      </label>

      {isReceipt ? (
        <>
          <label>
            Supplier / vendor
            <input
              name="supplierName"
              type="text"
              placeholder="Supplier name"
              list={vendorNames.length > 0 ? datalistId : undefined}
            />
            {vendorNames.length > 0 ? (
              <datalist id={datalistId}>
                {vendorNames.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            ) : null}
          </label>

          <div className="ws-ims-upload">
            <label className="ws-ims-upload-label">
              Invoice / document (PDF / image, max 4 MB)
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
        </>
      ) : null}

      {selected?.qcOnReceipt === "ALWAYS" && isReceipt ? (
        <p className="ws-ims-help">
          QC is always required for this item - stock goes to QC pending.
        </p>
      ) : null}

      {selected?.qcOnReceipt === "OFF" && isReceipt ? (
        <p className="ws-ims-help">QC is off - stock goes directly to usable.</p>
      ) : null}

      {showQcPrompt ? (
        <label className="ws-ims-checkbox">
          <input name="qcRequired" type="checkbox" value="yes" />
          QC required for this receipt?
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
          Record {MOVEMENT_LABELS[movementType]}
        </button>
      </div>
    </form>
  );
}
