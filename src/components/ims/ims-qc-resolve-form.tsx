"use client";

import { useActionState } from "react";
import type { ImsItem, ImsQcInspection, ImsStoreType } from "@prisma/client";
import { resolveQcAction, type ImsActionState } from "@/app/app/ims/actions";
import { formatImsQty } from "@/lib/ims/stock-status";

const initial: ImsActionState = { ok: false, message: "" };

type InspectionRow = ImsQcInspection & {
  item: ImsItem;
  storeType: ImsStoreType;
};

export function ImsQcResolveForm({ inspection }: { inspection: InspectionRow }) {
  const [state, action] = useActionState(resolveQcAction, initial);

  return (
    <article className="ws-ims-qc-card">
      <div className="ws-ims-qc-head">
        <strong>
          {inspection.item.code} - {inspection.item.name}
        </strong>
        <span>
          {formatImsQty(Number(inspection.quantity), inspection.item.uom)} |{" "}
          {inspection.storeType} store
        </span>
        <span className="ws-ims-meta">
          Received {inspection.createdAt.toLocaleString("en-IN")}
        </span>
      </div>

      <form action={action} className="ws-ims-form ws-ims-form-inline">
        <input type="hidden" name="inspectionId" value={inspection.id} />
        <label>
          Notes
          <input name="notes" type="text" placeholder="Inspection notes" />
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
            name="decision"
            value="pass"
            className="ws-btn-primary"
          >
            Pass to usable
          </button>
          <button
            type="submit"
            name="decision"
            value="fail"
            className="ws-btn-secondary"
          >
            Fail (scrap)
          </button>
        </div>
      </form>
    </article>
  );
}
