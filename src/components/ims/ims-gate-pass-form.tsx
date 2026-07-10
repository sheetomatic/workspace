"use client";

import { useEffect, useRef, useState } from "react";
import { useActionState } from "react";
import type { ImsItem } from "@prisma/client";
import { createGatePassAction, type ImsActionState } from "@/app/app/ims/actions";

type ItemOption = Pick<ImsItem, "id" | "code" | "name" | "uom">;

const initial: ImsActionState = { ok: false, message: "" };

type Line = { key: string; itemId: string; quantity: string };

let lineCounter = 0;
function newLine(itemId = ""): Line {
  lineCounter += 1;
  return { key: `line-${lineCounter}`, itemId, quantity: "" };
}

export function ImsGatePassForm({ items }: { items: ItemOption[] }) {
  const [state, action] = useActionState(createGatePassAction, initial);
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
      .filter((l) => l.itemId && l.quantity)
      .map((l) => ({
        itemId: l.itemId,
        quantity: Number.parseFloat(l.quantity),
      })),
  );

  return (
    <form ref={formRef} action={action} className="ws-ims-form">
      <div className="ws-ims-form-grid">
        <label>
          Party / contractor
          <input name="partyName" />
        </label>
        <label>
          Vehicle no.
          <input name="vehicleNo" />
        </label>
        <label>
          Site
          <input name="siteName" />
        </label>
        <label className="ws-ims-form-span2">
          Purpose
          <input name="purpose" required />
        </label>
      </div>
      <h3>Material lines</h3>
      {lines.map((line) => (
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
          <label>
            Qty
            <input
              type="number"
              min="0.001"
              step="any"
              value={line.quantity}
              onChange={(e) =>
                setLines((cur) =>
                  cur.map((l) =>
                    l.key === line.key ? { ...l, quantity: e.target.value } : l,
                  ),
                )
              }
              required
            />
          </label>
        </div>
      ))}
      <button
        type="button"
        className="ws-btn ws-btn-ghost"
        onClick={() => setLines((cur) => [...cur, newLine(items[0]?.id ?? "")])}
      >
        Add line
      </button>
      <input type="hidden" name="lines" value={linesJson} />
      <button type="submit" className="ws-btn ws-btn-primary">
        Save draft gate pass
      </button>
      {state.message ? (
        <p className={state.ok ? "ws-ims-success" : "ws-ims-error"}>{state.message}</p>
      ) : null}
    </form>
  );
}
