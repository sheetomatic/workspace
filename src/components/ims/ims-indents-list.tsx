"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ImsIndentStatus } from "@prisma/client";
import { updateIndentStatusAction } from "@/app/app/ims/actions";
import { INDENT_STATUS_LABELS } from "@/lib/ims/indent-labels";
import { formatImsQty } from "@/lib/ims/stock-status";

export type IndentListRow = {
  id: string;
  indentNumber: string;
  status: ImsIndentStatus;
  siteName: string | null;
  createdAt: Date;
  vendor: { name: string; code: string } | null;
  requisition: { requisitionNumber: string } | null;
  createdBy: { name: string | null; email: string };
  lines: Array<{
    quantity: unknown;
    item: { code: string; name: string; uom: string };
  }>;
};

function statusClass(status: ImsIndentStatus) {
  switch (status) {
    case "APPROVED":
      return "ws-ims-pill-green";
    case "CANCELLED":
      return "ws-ims-pill-red";
    case "PENDING":
      return "ws-ims-pill-orange";
    default:
      return "ws-ims-pill-blue";
  }
}

export function ImsIndentsList({
  indents,
  canApprove,
}: {
  indents: IndentListRow[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function act(id: string, status: "APPROVED" | "CANCELLED") {
    startTransition(async () => {
      const result = await updateIndentStatusAction(id, status);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  if (indents.length === 0) {
    return <p className="ws-ims-help">No indents yet. Create one from an approved MR.</p>;
  }

  return (
    <>
      {message ? <p className="ws-ims-help">{message}</p> : null}
      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>Indent #</th>
              <th>Status</th>
              <th>MR ref</th>
              <th>Vendor</th>
              <th>Lines</th>
              <th>Date</th>
              {canApprove ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {indents.map((row) => (
              <tr key={row.id}>
                <td data-label="Indent #">
                  <strong>{row.indentNumber}</strong>
                </td>
                <td data-label="Status">
                  <span className={`ws-ims-pill ${statusClass(row.status)}`}>
                    {INDENT_STATUS_LABELS[row.status]}
                  </span>
                </td>
                <td data-label="MR ref">{row.requisition?.requisitionNumber ?? "—"}</td>
                <td data-label="Vendor">{row.vendor?.name ?? "—"}</td>
                <td data-label="Lines">
                  <ul className="ws-ims-inline-list">
                    {row.lines.map((line, index) => (
                      <li key={index}>
                        {line.item.code}: {formatImsQty(Number(line.quantity), line.item.uom)}
                      </li>
                    ))}
                  </ul>
                </td>
                <td data-label="Date">{row.createdAt.toLocaleDateString("en-IN")}</td>
                {canApprove ? (
                  <td data-label="Actions">
                    {row.status === "PENDING" ? (
                      <div className="ws-ims-inline-actions">
                        <button
                          type="button"
                          className="ws-btn ws-btn-primary ws-btn-small"
                          disabled={pending}
                          onClick={() => act(row.id, "APPROVED")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="ws-btn ws-btn-ghost ws-btn-small"
                          disabled={pending}
                          onClick={() => act(row.id, "CANCELLED")}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
