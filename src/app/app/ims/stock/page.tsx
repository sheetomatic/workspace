import { PageHeader } from "@/components/saas/page-header";
import { requireSession } from "@/lib/require-session";
import { getStockRows } from "@/lib/ims/ims-store";
import {
  formatImsCurrency,
  formatImsQty,
  IMS_STOCK_STATUS_LABELS,
} from "@/lib/ims/stock-status";

export default async function ImsStockPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const rows = await getStockRows(user.organizationId);

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Stock levels"
        description="Usable quantity drives alert colours. QC pending is shown separately."
      />

      <div className="ws-ims-table-wrap">
        <table className="ws-ims-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Store</th>
              <th>Usable</th>
              <th>QC pending</th>
              <th>Min</th>
              <th>Reorder</th>
              <th>Max</th>
              <th>Value</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={10}>No stock records - add items and record movements.</td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.item.id}>
                  <td>{row.item.code}</td>
                  <td>{row.item.name}</td>
                  <td>{row.storeType}</td>
                  <td>{formatImsQty(row.usableQty, row.item.uom)}</td>
                  <td>{formatImsQty(row.qcPendingQty, row.item.uom)}</td>
                  <td>{formatImsQty(Number(row.item.minQty))}</td>
                  <td>{formatImsQty(Number(row.item.reorderQty))}</td>
                  <td>{formatImsQty(Number(row.item.maxQty))}</td>
                  <td>{formatImsCurrency(row.value)}</td>
                  <td>
                    <span className={`ws-ims-pill ws-ims-pill-${row.status}`}>
                      {IMS_STOCK_STATUS_LABELS[row.status]}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
