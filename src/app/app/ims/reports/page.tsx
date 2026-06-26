import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { ImsReportsCharts } from "@/components/ims/ims-reports-charts";
import { ImsReportExport } from "@/components/ims/ims-report-export";
import { requireSession } from "@/lib/require-session";
import { getImsReportData } from "@/lib/ims/ims-store";
import {
  IMS_STOCK_STATUS_LABELS,
  formatImsCurrency,
  formatImsQty,
} from "@/lib/ims/stock-status";

export default async function ImsReportsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const data = await getImsReportData(user.organizationId);

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Inventory reports"
        description="Valuation, ABC concentration, stock health, and movement trends across your stores."
      />

      <div className="ws-task-stats">
        <div className="ws-stat-card">
          <span>Total inventory value</span>
          <strong>{formatImsCurrency(data.totalValue)}</strong>
        </div>
        <div className="ws-stat-card ws-stat-done">
          <span>Active items</span>
          <strong>{data.itemCount}</strong>
        </div>
        <div className="ws-stat-card">
          <span>Categories</span>
          <strong>{data.categoryValuation.length}</strong>
        </div>
        <Link href="/app/ims/qc" className="ws-stat-card ws-stat-pending">
          <span>QC units on hold</span>
          <strong>{formatImsQty(data.pendingQcUnits)}</strong>
        </Link>
      </div>

      <ImsReportsCharts data={data} />

      <section className="ws-ims-panel">
        <div className="ws-ims-panel-head">
          <h2>Valuation by category</h2>
          <ImsReportExport data={data} />
        </div>
        <div className="ws-ims-table-wrap">
          <table className="ws-ims-table ws-ims-table-responsive">
            <thead>
              <tr>
                <th>Category</th>
                <th>Items</th>
                <th>Stock value</th>
                <th>Share</th>
              </tr>
            </thead>
            <tbody>
              {data.categoryValuation.length === 0 ? (
                <tr>
                  <td colSpan={4}>No stock value recorded yet.</td>
                </tr>
              ) : (
                data.categoryValuation.map((row) => (
                  <tr key={row.category}>
                    <td data-label="Category">{row.category}</td>
                    <td data-label="Items">{row.itemCount}</td>
                    <td data-label="Stock value">{formatImsCurrency(row.value)}</td>
                    <td data-label="Share">
                      {data.totalValue > 0
                        ? `${((row.value / data.totalValue) * 100).toFixed(1)}%`
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="ws-ims-panel">
        <h2>Top items by value</h2>
        <div className="ws-ims-table-wrap">
          <table className="ws-ims-table ws-ims-table-responsive">
            <thead>
              <tr>
                <th>Code</th>
                <th>Name</th>
                <th>Category</th>
                <th>Usable qty</th>
                <th>Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.topItems.length === 0 ? (
                <tr>
                  <td colSpan={6}>No items with stock value yet.</td>
                </tr>
              ) : (
                data.topItems.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Code">
                      <Link href={`/app/ims/items/${row.id}`}>{row.code}</Link>
                    </td>
                    <td data-label="Name">{row.name}</td>
                    <td data-label="Category">{row.category ?? "-"}</td>
                    <td data-label="Usable qty">
                      {formatImsQty(row.usableQty, row.uom)}
                    </td>
                    <td data-label="Value">{formatImsCurrency(row.value)}</td>
                    <td data-label="Status">
                      {IMS_STOCK_STATUS_LABELS[row.status]}
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
