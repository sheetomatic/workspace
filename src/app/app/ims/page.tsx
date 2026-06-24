import Link from "next/link";
import { PageHeader } from "@/components/saas/page-header";
import { requireSession } from "@/lib/require-session";
import { getImsDashboardStats } from "@/lib/ims/ims-store";
import {
  formatImsCurrency,
  IMS_STOCK_STATUS_LABELS,
} from "@/lib/ims/stock-status";

export default async function ImsDashboardPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const stats = await getImsDashboardStats(user.organizationId);

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Inventory (IMS)"
        description="Raw material and finished goods - stock levels, movements, and optional QC on receipt."
      />

      <div className="ws-task-stats">
        <div className="ws-stat-card">
          <span>Total inventory value</span>
          <strong>{formatImsCurrency(stats.totalValue)}</strong>
        </div>
        <div className="ws-stat-card ws-stat-done">
          <span>Active items</span>
          <strong>{stats.itemCount}</strong>
        </div>
        <div className="ws-stat-card ws-stat-pending">
          <span>QC pending (units)</span>
          <strong>{stats.pendingQc.toLocaleString("en-IN")}</strong>
        </div>
        <div className="ws-stat-card ws-stat-progress">
          <span>Below minimum</span>
          <strong>{stats.statusCounts.red}</strong>
        </div>
      </div>

      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <h2>Stock health</h2>
          <div className="ws-ims-status-grid">
            {(Object.keys(stats.statusCounts) as Array<keyof typeof stats.statusCounts>).map(
              (key) => (
                <div key={key} className={`ws-ims-status-card ws-ims-status-${key}`}>
                  <span>{IMS_STOCK_STATUS_LABELS[key]}</span>
                  <strong>{stats.statusCounts[key]}</strong>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="ws-ims-panel">
          <h2>ABC value split</h2>
          <ul className="ws-ims-abc-list">
            <li>
              <span>Class A</span>
              <strong>{formatImsCurrency(stats.abcValue.A)}</strong>
            </li>
            <li>
              <span>Class B</span>
              <strong>{formatImsCurrency(stats.abcValue.B)}</strong>
            </li>
            <li>
              <span>Class C</span>
              <strong>{formatImsCurrency(stats.abcValue.C)}</strong>
            </li>
          </ul>
        </section>
      </div>

      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Top items by value</h2>
            <Link href="/app/ims/stock">View all stock</Link>
          </div>
          <div className="ws-ims-table-wrap">
            <table className="ws-ims-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.topItems.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No items yet - add items to get started.</td>
                  </tr>
                ) : (
                  stats.topItems.map((row) => (
                    <tr key={row.code}>
                      <td>{row.code}</td>
                      <td>{row.name}</td>
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
        </section>

        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Recent movements</h2>
            <Link href="/app/ims/move">Record movement</Link>
          </div>
          <div className="ws-ims-table-wrap">
            <table className="ws-ims-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Item</th>
                  <th>Type</th>
                  <th>Qty</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentMovements.length === 0 ? (
                  <tr>
                    <td colSpan={4}>No movements recorded yet.</td>
                  </tr>
                ) : (
                  stats.recentMovements.map((row) => (
                    <tr key={row.id}>
                      <td>{row.createdAt.toLocaleDateString("en-IN")}</td>
                      <td>
                        {row.item.code} - {row.item.name}
                      </td>
                      <td>{row.movementType.replaceAll("_", " ")}</td>
                      <td>{Number(row.quantity).toLocaleString("en-IN")}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <div className="ws-ims-module-grid">
        <Link className="ws-ims-module-card" href="/app/ims/items">
          <strong>Item master</strong>
          <p>Codes, min/reorder/max, unit cost, ABC class, and QC policy per item.</p>
        </Link>
        <Link className="ws-ims-module-card" href="/app/ims/move">
          <strong>Movements</strong>
          <p>RM In, issue to production, FG In, and FG Out with optional QC on receipt.</p>
        </Link>
        <Link className="ws-ims-module-card" href="/app/ims/qc">
          <strong>QC queue</strong>
          <p>Pass or fail pending inspections - pass moves stock to usable.</p>
        </Link>
      </div>
    </div>
  );
}
