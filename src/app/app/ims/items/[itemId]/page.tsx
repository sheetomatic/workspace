import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { requireSession } from "@/lib/require-session";
import { getItemDetail, listImsCustomFields } from "@/lib/ims/ims-store";
import {
  formatImsCurrency,
  formatImsQty,
  IMS_STOCK_STATUS_LABELS,
} from "@/lib/ims/stock-status";

function formatCustomValue(value: unknown, fieldType: string): string {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (fieldType === "CHECKBOX") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

const MOVEMENT_LABELS: Record<string, string> = {
  RM_IN: "RM In",
  ISSUE_TO_PRODUCTION: "Issue to production",
  FG_IN: "FG In",
  FG_OUT: "FG Out",
  QC_PASS: "QC pass",
  QC_FAIL: "QC fail",
  ADJUSTMENT: "Adjustment",
};

export default async function ImsItemDetailPage({
  params,
}: {
  params: Promise<{ itemId: string }>;
}) {
  const user = await requireSession(undefined, { module: "IMS" });
  const { itemId } = await params;
  const [detail, customFields] = await Promise.all([
    getItemDetail(user.organizationId, itemId),
    listImsCustomFields(user.organizationId, "ITEM"),
  ]);

  if (!detail) {
    notFound();
  }

  const { item } = detail;
  const customValues =
    (item.customValues as Record<string, unknown> | null) ?? {};
  const activeCustomFields = customFields.filter((field) => field.isActive);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title={`${item.code} - ${item.name}`}
        description={item.description ?? "Item stock, thresholds, and movement history."}
      />

      <p className="ws-ims-help">
        <Link href="/app/ims/items">Back to items</Link>
      </p>

      <div className="ws-task-stats">
        <div className="ws-stat-card">
          <span>Usable</span>
          <strong>{formatImsQty(detail.usableQty, item.uom)}</strong>
        </div>
        <div className="ws-stat-card ws-stat-pending">
          <span>QC pending</span>
          <strong>{formatImsQty(detail.qcPendingQty, item.uom)}</strong>
        </div>
        <div className="ws-stat-card ws-stat-done">
          <span>Stock value</span>
          <strong>{formatImsCurrency(detail.value)}</strong>
        </div>
        <div className="ws-stat-card ws-stat-progress">
          <span>Status</span>
          <strong>
            <span className={`ws-ims-pill ws-ims-pill-${detail.status}`}>
              {IMS_STOCK_STATUS_LABELS[detail.status]}
            </span>
          </strong>
        </div>
      </div>

      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <h2>Details</h2>
          <ul className="ws-ims-abc-list">
            <li>
              <span>Type</span>
              <strong>
                {item.itemType === "RAW_MATERIAL" ? "Raw material" : "Finished good"}
              </strong>
            </li>
            <li>
              <span>Category</span>
              <strong>{item.category ?? "-"}</strong>
            </li>
            <li>
              <span>ABC class</span>
              <strong>{item.abcClass}</strong>
            </li>
            <li>
              <span>Unit cost</span>
              <strong>{formatImsCurrency(Number(item.unitCost))}</strong>
            </li>
            <li>
              <span>QC on receipt</span>
              <strong>{item.qcOnReceipt}</strong>
            </li>
            <li>
              <span>Active</span>
              <strong>{item.isActive ? "Yes" : "No"}</strong>
            </li>
          </ul>
        </section>

        <section className="ws-ims-panel">
          <h2>Thresholds</h2>
          <ul className="ws-ims-abc-list">
            <li>
              <span>Minimum</span>
              <strong>{formatImsQty(Number(item.minQty), item.uom)}</strong>
            </li>
            <li>
              <span>Reorder</span>
              <strong>{formatImsQty(Number(item.reorderQty), item.uom)}</strong>
            </li>
            <li>
              <span>Maximum</span>
              <strong>{formatImsQty(Number(item.maxQty), item.uom)}</strong>
            </li>
            <li>
              <span>Pending QC inspections</span>
              <strong>{detail.pendingQc}</strong>
            </li>
          </ul>
        </section>
      </div>

      {activeCustomFields.length > 0 ? (
        <section className="ws-ims-panel">
          <h2>Custom fields</h2>
          <ul className="ws-ims-abc-list">
            {activeCustomFields.map((field) => (
              <li key={field.id}>
                <span>{field.label}</span>
                <strong>
                  {formatCustomValue(customValues[field.key], field.fieldType)}
                </strong>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="ws-ims-panel">
        <h2>Movement history</h2>
        <div className="ws-ims-table-wrap">
          <table className="ws-ims-table ws-ims-table-responsive">
            <thead>
              <tr>
                <th>When</th>
                <th>Type</th>
                <th>Qty</th>
                <th>PO / Supplier</th>
                <th>Invoice</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {detail.movements.length === 0 ? (
                <tr>
                  <td colSpan={6}>No movements recorded for this item.</td>
                </tr>
              ) : (
                detail.movements.map((row) => (
                  <tr key={row.id}>
                    <td data-label="When">
                      {row.createdAt.toLocaleString("en-IN")}
                    </td>
                    <td data-label="Type">
                      {MOVEMENT_LABELS[row.movementType] ?? row.movementType}
                    </td>
                    <td data-label="Qty">
                      {Number(row.quantity).toLocaleString("en-IN")} {item.uom}
                    </td>
                    <td data-label="PO / Supplier">
                      {row.poNumber || row.supplierName ? (
                        <>
                          {row.poNumber ?? "-"}
                          {row.supplierName ? (
                            <small className="ws-ims-cell-sub">
                              {row.supplierName}
                            </small>
                          ) : null}
                        </>
                      ) : (
                        row.reference ?? "-"
                      )}
                    </td>
                    <td data-label="Invoice">
                      {row.invoiceNumber ?? "-"}
                      {row.attachmentId ? (
                        <>
                          {" "}
                          <a
                            href={`/api/ims/attachments/${row.attachmentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ws-ims-link"
                          >
                            View
                          </a>
                        </>
                      ) : null}
                    </td>
                    <td data-label="By">
                      {row.createdBy?.name ?? row.createdBy?.email ?? "-"}
                    </td>
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
