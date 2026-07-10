"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ImsRequisitionStatus } from "@prisma/client";
import { updateRequisitionStatusAction } from "@/app/app/ims/actions";
import { REQUISITION_STATUS_LABELS } from "@/lib/ims/requisition-labels";
import { formatImsQty } from "@/lib/ims/stock-status";

export type RequisitionListRow = {
  id: string;
  requisitionNumber: string;
  status: ImsRequisitionStatus;
  siteName: string | null;
  department: string | null;
  purpose: string | null;
  createdAt: Date;
  requestedBy: { name: string | null; email: string };
  approvedBy: { name: string | null } | null;
  lines: Array<{
    quantityRequested: unknown;
    quantityApproved: unknown;
    item: { code: string; name: string; uom: string };
  }>;
};

function statusClass(status: ImsRequisitionStatus) {
  switch (status) {
    case "APPROVED":
      return "ws-ims-pill-green";
    case "REJECTED":
      return "ws-ims-pill-red";
    case "PENDING":
      return "ws-ims-pill-orange";
    default:
      return "ws-ims-pill-blue";
  }
}

export function ImsRequisitionsList({
  requisitions,
  canApprove,
}: {
  requisitions: RequisitionListRow[];
  canApprove: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState("");

  function act(id: string, status: "APPROVED" | "REJECTED") {
    startTransition(async () => {
      const reason =
        status === "REJECTED"
          ? window.prompt("Rejection reason (optional)") ?? undefined
          : undefined;
      const result = await updateRequisitionStatusAction(id, status, reason);
      setMessage(result.message);
      if (result.ok) {
        router.refresh();
      }
    });
  }

  if (requisitions.length === 0) {
    return (
      <p className="ws-ims-help">
        No material requisitions yet.{" "}
        <Link href="/app/ims/requisitions/new">Create the first MR</Link>.
      </p>
    );
  }

  return (
    <>
      {message ? <p className="ws-ims-help">{message}</p> : null}
      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table ws-ims-table-responsive">
          <thead>
            <tr>
              <th>MR #</th>
              <th>Status</th>
              <th>Requested by</th>
              <th>Site / dept</th>
              <th>Lines</th>
              <th>Date</th>
              {canApprove ? <th>Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {requisitions.map((row) => (
              <tr key={row.id}>
                <td data-label="MR #">
                  <strong>{row.requisitionNumber}</strong>
                </td>
                <td data-label="Status">
                  <span className={`ws-ims-pill ${statusClass(row.status)}`}>
                    {REQUISITION_STATUS_LABELS[row.status]}
                  </span>
                </td>
                <td data-label="Requested by">
                  {row.requestedBy.name ?? row.requestedBy.email}
                </td>
                <td data-label="Site / dept">
                  {[row.siteName, row.department].filter(Boolean).join(" · ") || "—"}
                </td>
                <td data-label="Lines">
                  <ul className="ws-ims-inline-list">
                    {row.lines.map((line, index) => (
                      <li key={index}>
                        {line.item.code}:{" "}
                        {formatImsQty(
                          Number(line.quantityApproved ?? line.quantityRequested),
                          line.item.uom,
                        )}
                      </li>
                    ))}
                  </ul>
                </td>
                <td data-label="Date">
                  {row.createdAt.toLocaleDateString("en-IN")}
                </td>
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
                          onClick={() => act(row.id, "REJECTED")}
                        >
                          Reject
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
