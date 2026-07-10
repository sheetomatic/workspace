"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ImsGatePassStatus } from "@prisma/client";
import { issueGatePassAction } from "@/app/app/ims/actions";
import { formatImsQty } from "@/lib/ims/stock-status";

export type GatePassRow = {
  id: string;
  passNumber: string;
  status: ImsGatePassStatus;
  partyName: string | null;
  vehicleNo: string | null;
  purpose: string | null;
  lines: Array<{
    quantity: unknown;
    item: { code: string; name: string; uom: string };
  }>;
};

export function ImsGatePassList({ passes }: { passes: GatePassRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function issue(id: string) {
    startTransition(async () => {
      const result = await issueGatePassAction(id);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  if (passes.length === 0) {
    return <p className="ws-ims-help">No gate passes yet.</p>;
  }

  return (
    <>
      {message ? <p className="ws-ims-help">{message}</p> : null}
      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>Pass #</th>
              <th>Status</th>
              <th>Party / vehicle</th>
              <th>Lines</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {passes.map((row) => (
              <tr key={row.id}>
                <td data-label="Pass #">
                  <strong>{row.passNumber}</strong>
                </td>
                <td data-label="Status">{row.status}</td>
                <td data-label="Party / vehicle">
                  {[row.partyName, row.vehicleNo].filter(Boolean).join(" · ") || "—"}
                </td>
                <td data-label="Lines">
                  <ul className="ws-ims-inline-list">
                    {row.lines.map((line, i) => (
                      <li key={i}>
                        {line.item.code}: {formatImsQty(Number(line.quantity), line.item.uom)}
                      </li>
                    ))}
                  </ul>
                </td>
                <td data-label="Actions">
                  {row.status === "DRAFT" ? (
                    <button
                      type="button"
                      className="ws-btn ws-btn-primary ws-btn-small"
                      disabled={pending}
                      onClick={() => issue(row.id)}
                    >
                      Issue pass
                    </button>
                  ) : (
                    row.status
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
