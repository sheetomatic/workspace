"use client";

import { useState } from "react";
import { useActionState } from "react";
import type { ImsItem } from "@prisma/client";
import {
  recordAdjustmentAction,
  type ImsActionState,
} from "@/app/app/ims/actions";

type ItemOption = Pick<ImsItem, "id" | "code" | "name" | "uom">;

const initial: ImsActionState = { ok: false, message: "" };

export function ImsAdjustForm({
  items,
  usableMap,
}: {
  items: ItemOption[];
  usableMap?: Record<string, number>;
}) {
  const [state, action] = useActionState(recordAdjustmentAction, initial);
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [direction, setDirection] = useState<"increase" | "decrease">("increase");
  const selected = items.find((item) => item.id === itemId);
  const available = selected ? usableMap?.[selected.id] ?? 0 : 0;

  return (
    <form action={action} className="ws-ims-form">
      <input type="hidden" name="direction" value={direction} />
      <h3>Stock adjustment</h3>

      <label>
        Item
        <select
          name="itemId"
          required
          value={itemId}
          onChange={(event) => setItemId(event.target.value)}
        >
          {items.length === 0 ? (
            <option value="">No items available</option>
          ) : (
            items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.code} - {item.name}
              </option>
            ))
          )}
        </select>
      </label>

      {selected ? (
        <p className="ws-ims-help">
          Current usable: {available.toLocaleString("en-IN")} {selected.uom}
        </p>
      ) : null}

      <div className="ws-ims-toggle">
        <button
          type="button"
          className={direction === "increase" ? "is-active" : ""}
          onClick={() => setDirection("increase")}
        >
          Increase (+)
        </button>
        <button
          type="button"
          className={direction === "decrease" ? "is-active" : ""}
          onClick={() => setDirection("decrease")}
        >
          Decrease (-)
        </button>
      </div>

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
        <input name="reference" type="text" placeholder="Cycle count / correction" />
      </label>

      <label>
        Reason / notes
        <textarea name="notes" rows={2} placeholder="Why is this adjustment needed?" />
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
        <button type="submit" className="ws-btn-primary" disabled={!itemId}>
          Record adjustment
        </button>
      </div>
    </form>
  );
}
