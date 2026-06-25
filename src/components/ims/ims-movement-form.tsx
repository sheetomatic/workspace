"use client";

import { useMemo, useState } from "react";
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
}: {
  items: ItemOption[];
  movementType: ImsMovementType;
  usableMap?: Record<string, number>;
}) {
  const [state, action] = useFormState(recordMovementAction, initial);
  const filtered = useMemo(
    () => itemsForMovement(items, movementType),
    [items, movementType],
  );
  const [itemId, setItemId] = useState(filtered[0]?.id ?? "");
  const selected = filtered.find((item) => item.id === itemId);
  const isReceipt = movementType === "RM_IN" || movementType === "FG_IN";
  const isIssue =
    movementType === "ISSUE_TO_PRODUCTION" || movementType === "FG_OUT";
  const showQcPrompt = isReceipt && selected?.qcOnReceipt === "OPTIONAL";
  const available = selected ? usableMap?.[selected.id] ?? 0 : 0;

  return (
    <form action={action} className="ws-ims-form">
      <input type="hidden" name="movementType" value={movementType} />
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
        <button type="submit" className="ws-btn-primary" disabled={!itemId}>
          Record {MOVEMENT_LABELS[movementType]}
        </button>
      </div>
    </form>
  );
}
