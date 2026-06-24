"use client";

import { useFormState } from "react-dom";
import type { ImsItem } from "@prisma/client";
import { saveImsItemAction, type ImsActionState } from "@/app/app/ims/actions";

const initial: ImsActionState = { ok: false, message: "" };

export function ImsItemForm({ item }: { item?: ImsItem }) {
  const [state, action] = useFormState(saveImsItemAction, initial);

  return (
    <form action={action} className="ws-ims-form">
      {item ? <input type="hidden" name="id" value={item.id} /> : null}

      <div className="ws-ims-form-grid">
        <label>
          Code
          <input
            name="code"
            required
            defaultValue={item?.code}
            placeholder="RM-001"
            disabled={Boolean(item)}
          />
        </label>
        <label>
          Name
          <input name="name" required defaultValue={item?.name ?? ""} />
        </label>
        <label>
          Type
          <select name="itemType" defaultValue={item?.itemType ?? "RAW_MATERIAL"}>
            <option value="RAW_MATERIAL">Raw material</option>
            <option value="FINISHED_GOOD">Finished good</option>
          </select>
        </label>
        <label>
          UOM
          <input name="uom" defaultValue={item?.uom ?? "pcs"} />
        </label>
        <label>
          Category
          <input name="category" defaultValue={item?.category ?? ""} />
        </label>
        <label>
          ABC class
          <select name="abcClass" defaultValue={item?.abcClass ?? "C"}>
            <option value="A">A</option>
            <option value="B">B</option>
            <option value="C">C</option>
          </select>
        </label>
        <label>
          Unit cost (INR)
          <input
            name="unitCost"
            type="number"
            min="0"
            step="any"
            defaultValue={item ? Number(item.unitCost) : 0}
          />
        </label>
        <label>
          Min qty
          <input
            name="minQty"
            type="number"
            min="0"
            step="any"
            defaultValue={item ? Number(item.minQty) : 0}
          />
        </label>
        <label>
          Reorder qty
          <input
            name="reorderQty"
            type="number"
            min="0"
            step="any"
            defaultValue={item ? Number(item.reorderQty) : 0}
          />
        </label>
        <label>
          Max qty
          <input
            name="maxQty"
            type="number"
            min="0"
            step="any"
            defaultValue={item ? Number(item.maxQty) : 0}
          />
        </label>
        <label>
          QC on receipt
          <select name="qcOnReceipt" defaultValue={item?.qcOnReceipt ?? "OPTIONAL"}>
            <option value="OFF">Off - straight to usable</option>
            <option value="OPTIONAL">Optional - ask on receipt</option>
            <option value="ALWAYS">Always - QC pending</option>
          </select>
        </label>
      </div>

      <label>
        Description
        <textarea
          name="description"
          rows={2}
          defaultValue={item?.description ?? ""}
        />
      </label>

      <label className="ws-ims-checkbox">
        <input
          name="isActive"
          type="checkbox"
          defaultChecked={item?.isActive ?? true}
        />
        Active item
      </label>

      {state.message ? (
        <p className={state.ok ? "ws-ims-feedback" : "ws-ims-feedback ws-ims-feedback-error"}>
          {state.message}
        </p>
      ) : null}

      <div className="ws-ims-form-actions">
        <button type="submit" className="ws-btn-primary">
          {item ? "Update item" : "Create item"}
        </button>
      </div>
    </form>
  );
}
