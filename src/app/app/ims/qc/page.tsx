import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsQcResolveForm } from "@/components/ims/ims-qc-resolve-form";
import { requireSession } from "@/lib/require-session";
import { listPendingQc, listQcHistory } from "@/lib/ims/ims-store";
import { formatImsQty } from "@/lib/ims/stock-status";

export default async function ImsQcPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [pending, history] = await Promise.all([
    listPendingQc(user.organizationId),
    listQcHistory(user.organizationId),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="QC queue"
        description="Inspect receipts held in QC pending. Pass moves quantity to usable stock; fail removes it from inventory."
      />

      <section className="ws-ims-panel">
        <h2>Pending ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="ws-ims-help">No pending QC inspections.</p>
        ) : (
          <div className="ws-ims-qc-list">
            {pending.map((inspection) => (
              <ImsQcResolveForm key={inspection.id} inspection={inspection} />
            ))}
          </div>
        )}
      </section>

      <section className="ws-ims-panel">
        <h2>History</h2>
        <div className="ws-ims-table-wrap">
          <table className="ws-ims-table ws-ims-table-responsive">
            <thead>
              <tr>
                <th>Inspected</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Result</th>
                <th>By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6}>No resolved inspections yet.</td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Inspected">
                      {row.inspectedAt
                        ? row.inspectedAt.toLocaleString("en-IN")
                        : "-"}
                    </td>
                    <td data-label="Item">
                      {row.item.code} - {row.item.name}
                    </td>
                    <td data-label="Qty">
                      {formatImsQty(Number(row.quantity), row.item.uom)}
                    </td>
                    <td data-label="Result">
                      <span
                        className={`ws-ims-pill ws-ims-pill-${
                          row.status === "PASSED" ? "green" : "red"
                        }`}
                      >
                        {row.status === "PASSED" ? "Passed" : "Failed"}
                      </span>
                    </td>
                    <td data-label="By">
                      {row.inspectedBy?.name ?? row.inspectedBy?.email ?? "-"}
                    </td>
                    <td data-label="Notes">{row.notes ?? "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
