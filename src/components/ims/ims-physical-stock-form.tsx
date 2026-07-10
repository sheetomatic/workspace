"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import type { ImsItem } from "@prisma/client";
import {
  createPhysicalStockCountAction,
  type ImsActionState,
} from "@/app/app/ims/actions";
import { formatImsQty } from "@/lib/ims/stock-status";

type ItemOption = Pick<ImsItem, "id" | "code" | "name" | "uom">;

const initial: ImsActionState = { ok: false, message: "" };

type Line = { key: string; itemId: string; physicalQty: string };

let lineCounter = 0;
function newLine(itemId = ""): Line {
  lineCounter += 1;
  return { key: `line-${lineCounter}`, itemId, physicalQty: "" };
}

export function ImsPhysicalStockForm({
  items,
  usableMap,
}: {
  items: ItemOption[];
  usableMap: Record<string, number>;
}) {
  const [state, action] = useActionState(createPhysicalStockCountAction, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const [lines, setLines] = useState<Line[]>([newLine(items[0]?.id ?? "")]);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setLines([newLine(items[0]?.id ?? "")]);
    }
  }, [state, items]);

  const linesJson = JSON.stringify(
    lines
      .filter((l) => l.itemId && l.physicalQty)
      .map((l) => ({
        itemId: l.itemId,
        physicalQty: Number.parseFloat(l.physicalQty),
      })),
  );

  return (
    <form ref={formRef} action={action} className="ws-ims-form">
      <label>
        Site
        <input name="siteName" placeholder="Store / site" />
      </label>
      <label>
        Notes
        <textarea name="notes" rows={2} />
      </label>
      <h3>Counted lines</h3>
      {lines.map((line) => {
        const item = items.find((i) => i.id === line.itemId);
        const system = item ? usableMap[item.id] ?? 0 : 0;
        return (
          <div key={line.key} className="ws-ims-receipt-line">
            <label>
              Item
              <select
                value={line.itemId}
                onChange={(e) =>
                  setLines((cur) =>
                    cur.map((l) =>
                      l.key === line.key ? { ...l, itemId: e.target.value } : l,
                    ),
                  )
                }
              >
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name}
                  </option>
                ))}
              </select>
            </label>
            <p className="ws-ims-help">
              System: {item ? formatImsQty(system, item.uom) : "—"}
            </p>
            <label>
              Physical qty
              <input
                type="number"
                min="0"
                step="any"
                value={line.physicalQty}
                onChange={(e) =>
                  setLines((cur) =>
                    cur.map((l) =>
                      l.key === line.key ? { ...l, physicalQty: e.target.value } : l,
                    ),
                  )
                }
                required
              />
            </label>
          </div>
        );
      })}
      <button
        type="button"
        className="ws-btn ws-btn-ghost"
        onClick={() => setLines((cur) => [...cur, newLine(items[0]?.id ?? "")])}
      >
        Add line
      </button>
      <input type="hidden" name="lines" value={linesJson} />
      <button type="submit" className="ws-btn ws-btn-primary">
        Save draft count
      </button>
      {state.message ? (
        <p className={state.ok ? "ws-ims-success" : "ws-ims-error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
