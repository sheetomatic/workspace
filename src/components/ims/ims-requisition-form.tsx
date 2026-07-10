"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import type { ImsItem } from "@prisma/client";
import {
  createMaterialRequisitionAction,
  type ImsActionState,
} from "@/app/app/ims/actions";

type ItemOption = Pick<ImsItem, "id" | "code" | "name" | "uom">;

const initial: ImsActionState = { ok: false, message: "" };

type Line = {
  key: string;
  itemId: string;
  quantityRequested: string;
  notes: string;
};

let lineCounter = 0;
function newLine(itemId = ""): Line {
  lineCounter += 1;
  return {
    key: `line-${lineCounter}`,
    itemId,
    quantityRequested: "",
    notes: "",
  };
}

export function ImsRequisitionForm({ items }: { items: ItemOption[] }) {
  const [state, action] = useActionState(createMaterialRequisitionAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<Line[]>([newLine(items[0]?.id ?? "")]);

  const itemOptions = useMemo(() => items, [items]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setLines([newLine(items[0]?.id ?? "")]);
    }
  }, [state, items]);

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((current) => [...current, newLine(items[0]?.id ?? "")]);
  }

  function removeLine(key: string) {
    setLines((current) => (current.length <= 1 ? current : current.filter((l) => l.key !== key)));
  }

  const linesJson = JSON.stringify(
    lines
      .filter((line) => line.itemId && line.quantityRequested)
      .map((line) => ({
        itemId: line.itemId,
        quantityRequested: Number.parseFloat(line.quantityRequested),
        notes: line.notes || undefined,
      })),
  );

  return (
    <form ref={formRef} action={action} className="ws-ims-form ws-ims-requisition-form">
      <div className="ws-ims-form-grid">
        <label>
          Site / location
          <input name="siteName" placeholder="e.g. Plant 1" />
        </label>
        <label>
          Department
          <input name="department" placeholder="e.g. Production" />
        </label>
        <label className="ws-ims-form-span2">
          Purpose
          <input name="purpose" placeholder="Why materials are needed" />
        </label>
        <label className="ws-ims-form-span2">
          Notes
          <textarea name="notes" rows={2} placeholder="Optional notes for approver" />
        </label>
      </div>

      <h3>Line items</h3>
      <div className="ws-ims-receipt-lines">
        {lines.map((line) => (
          <div key={line.key} className="ws-ims-receipt-line">
            <label>
              Item
              <select
                value={line.itemId}
                onChange={(e) => updateLine(line.key, { itemId: e.target.value })}
                required
              >
                <option value="">Select item</option>
                {itemOptions.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Qty requested
              <input
                type="number"
                min="0.001"
                step="any"
                value={line.quantityRequested}
                onChange={(e) => updateLine(line.key, { quantityRequested: e.target.value })}
                required
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

      <input type="hidden" name="lines" value={linesJson} />

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
