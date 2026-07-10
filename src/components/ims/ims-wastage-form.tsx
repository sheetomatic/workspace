"use client";

import { useActionState } from "react";
import type { ImsItem } from "@prisma/client";
import { recordWastageAction, type ImsActionState } from "@/app/app/ims/actions";
import { formatImsQty } from "@/lib/ims/stock-status";

type ItemOption = Pick<ImsItem, "id" | "code" | "name" | "uom">;

const initial: ImsActionState = { ok: false, message: "" };

export function ImsWastageForm({
  items,
  usableMap,
}: {
  items: ItemOption[];
  usableMap: Record<string, number>;
}) {
  const [state, action] = useActionState(recordWastageAction, initial);

  return (
    <form action={action} className="ws-ims-form">
      <label>
        Item
        <select name="itemId" required defaultValue={items[0]?.id ?? ""}>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code} — {item.name} (usable: {formatImsQty(usableMap[item.id] ?? 0, item.uom)})
            </option>
          ))}
        </select>
      </label>
      <label>
        Wastage qty
        <input type="number" name="quantity" min="0.001" step="any" required />
      </label>
      <label>
        Reference
        <input name="reference" placeholder="e.g. WAST-REF-001" />
      </label>
      <label>
        Reason
        <textarea name="notes" rows={2} placeholder="Scrap reason" />
      </label>
      <button type="submit" className="ws-btn ws-btn-primary">
        Record wastage
      </button>
      {state.message ? (
        <p className={state.ok ? "ws-ims-success" : "ws-ims-error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
