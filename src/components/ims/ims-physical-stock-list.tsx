"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ImsStockCountStatus } from "@prisma/client";
import { postPhysicalStockCountAction } from "@/app/app/ims/actions";
import { formatImsQty } from "@/lib/ims/stock-status";

export type PhysicalStockCountRow = {
  id: string;
  countNumber: string;
  status: ImsStockCountStatus;
  siteName: string | null;
  countedAt: Date;
  lines: Array<{
    systemQty: unknown;
    physicalQty: unknown;
    item: { code: string; name: string; uom: string };
  }>;
};

export function ImsPhysicalStockList({ counts }: { counts: PhysicalStockCountRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function post(id: string) {
    startTransition(async () => {
      const result = await postPhysicalStockCountAction(id);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  if (counts.length === 0) {
    return <p className="ws-ims-help">No physical stock counts yet.</p>;
  }

  return (
    <>
      {message ? <p className="ws-ims-help">{message}</p> : null}
      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>Count #</th>
              <th>Status</th>
              <th>Site</th>
              <th>Lines</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {counts.map((row) => (
              <tr key={row.id}>
                <td data-label="Count #">
                  <strong>{row.countNumber}</strong>
                </td>
                <td data-label="Status">{row.status}</td>
                <td data-label="Site">{row.siteName ?? "—"}</td>
                <td data-label="Lines">
                  <ul className="ws-ims-inline-list">
                    {row.lines.map((line, i) => {
                      const variance =
                        Number(line.physicalQty) - Number(line.systemQty);
                      return (
                        <li key={i}>
                          {line.item.code}: sys{" "}
                          {formatImsQty(Number(line.systemQty), line.item.uom)} → phys{" "}
                          {formatImsQty(Number(line.physicalQty), line.item.uom)}
                          {variance !== 0 ? ` (${variance > 0 ? "+" : ""}${variance})` : ""}
                        </li>
                      );
                    })}
                  </ul>
                </td>
                <td data-label="Date">{row.countedAt.toLocaleDateString("en-IN")}</td>
                <td data-label="Actions">
                  {row.status === "DRAFT" ? (
                    <button
                      type="button"
                      className="ws-btn ws-btn-primary ws-btn-small"
                      disabled={pending}
                      onClick={() => post(row.id)}
                    >
                      Post variances
                    </button>
                  ) : (
                    "Posted"
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
