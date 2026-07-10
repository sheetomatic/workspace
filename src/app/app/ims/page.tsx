import Link from "next/link";
import { TaskPageToolbar } from "@/components/saas/task-page-toolbar";
import { ImsSalesOrderStockList } from "@/components/ims/ims-sales-order-stock-list";
import { ImsTeamAccessPanel } from "@/components/ims/ims-team-access-panel";
import { requireSession } from "@/lib/require-session";
import { countManagersMissingIms, getImsDashboardStats } from "@/lib/ims/ims-store";
import { getStoreWorkflowCounts } from "@/lib/ims/store-analytics";
import { listSalesOrders } from "@/lib/leads/sales-orders";
import { IMS_SALES_ORDER_STOCK_PATH } from "@/lib/ims/sales-order-stock";
import { hasMinimumRole } from "@/lib/permissions";
import {
  formatImsCurrency,
  formatImsQty,
  IMS_STOCK_STATUS_LABELS,
} from "@/lib/ims/stock-status";

export default async function ImsDashboardPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [stats, workflow, membersMissingIms, stockOrders] = await Promise.all([
    getImsDashboardStats(user.organizationId),
    getStoreWorkflowCounts(user.organizationId),
    hasMinimumRole(user.role, "ADMIN")
      ? countManagersMissingIms(user.organizationId)
      : Promise.resolve(0),
    listSalesOrders(user.organizationId, { pipeline: "stock_fulfillment", limit: 5 }),
  ]);

  return (
    <div className="ws-ims-page">
      <TaskPageToolbar
        title="Store dashboard"
        description="Exceptions-first numbers for EM — open modules from the sidebar."
      />

      <div className="ws-task-stats ws-ims-dashboard-stats">
        <div className="ws-stat-card">
          <span>Inventory value</span>
          <strong>{formatImsCurrency(stats.totalValue)}</strong>
        </div>
        <div className="ws-stat-card ws-stat-done">
          <span>Active items</span>
          <strong>{stats.itemCount.toLocaleString("en-IN")}</strong>
        </div>
        <Link href="/app/ims/stock" className="ws-stat-card ws-stat-progress">
          <span>Below minimum</span>
          <strong>{stats.statusCounts.red.toLocaleString("en-IN")}</strong>
          <small>{stats.statusCounts.orange} reorder soon</small>
        </Link>
        <Link href="/app/ims/qc" className="ws-stat-card ws-stat-pending">
          <span>QC pending</span>
          <strong>{stats.pendingQcCount.toLocaleString("en-IN")}</strong>
          <small>{formatImsQty(stats.pendingQcUnits)} on hold</small>
        </Link>
      </div>

      <div className="ws-task-stats ws-ims-dashboard-stats">
        <Link href="/app/ims/requisitions" className="ws-stat-card ws-stat-pending">
          <span>MR pending approval</span>
          <strong>{workflow.mrPending.toLocaleString("en-IN")}</strong>
          <small>{workflow.mrDraft} drafts</small>
        </Link>
        <Link href="/app/ims/indents" className="ws-stat-card ws-stat-progress">
          <span>Indents pending</span>
          <strong>{workflow.indentPending.toLocaleString("en-IN")}</strong>
        </Link>
        <Link href="/app/ims/purchase" className="ws-stat-card">
          <span>Purchase bills (draft)</span>
          <strong>{workflow.purchaseBillsDraft.toLocaleString("en-IN")}</strong>
        </Link>
        <Link href="/app/ims/movements" className="ws-stat-card ws-stat-done">
          <span>Movements (7 days)</span>
          <strong>{workflow.movementsLast7Days.toLocaleString("en-IN")}</strong>
        </Link>
        <Link href="/app/ims/physical-stock" className="ws-stat-card">
          <span>Stock counts (draft)</span>
          <strong>{workflow.physicalCountsDraft.toLocaleString("en-IN")}</strong>
        </Link>
        <Link href="/app/ims/gate-pass" className="ws-stat-card ws-stat-progress">
          <span>Gate passes (draft)</span>
          <strong>{workflow.gatePassesDraft.toLocaleString("en-IN")}</strong>
        </Link>
        <Link href="/app/ims/wastage" className="ws-stat-card ws-stat-pending">
          <span>Wastage (7 days)</span>
          <strong>{workflow.wastageLast7Days.toLocaleString("en-IN")}</strong>
        </Link>
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
          <p className="ws-ims-help ws-ims-master-counts">
            {workflow.vendorCount} vendors · {workflow.rackSections} rack sections
          </p>
        </section>
      </div>

      <section className="ws-ims-panel">
        <div className="ws-ims-panel-head">
          <h2>Reorder exceptions</h2>
          <Link href="/app/ims/stock">Stock on screen</Link>
        </div>
        {stats.reorderList.length === 0 ? (
          <p className="ws-ims-help">All items are at healthy levels.</p>
        ) : (
          <div className="ws-ims-table-wrap">
            <table className="ws-ims-table ws-ims-table-responsive">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Usable</th>
                  <th>Reorder at</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {stats.reorderList.map((row) => (
                  <tr key={row.id}>
                    <td data-label="Code">
                      <Link href={`/app/ims/items/${row.id}`}>{row.code}</Link>
                    </td>
                    <td data-label="Name">{row.name}</td>
                    <td data-label="Usable">{formatImsQty(row.usableQty, row.uom)}</td>
                    <td data-label="Reorder at">{formatImsQty(row.reorderQty)}</td>
                    <td data-label="Status">
                      <span className={`ws-ims-pill ws-ims-pill-${row.status}`}>
                        {IMS_STOCK_STATUS_LABELS[row.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <div className="ws-ims-panel-head">
            <h2>Top items by value</h2>
            <Link href="/app/ims/register">Stock register</Link>
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
                    <td colSpan={4}>No items yet — add items to get started.</td>
                  </tr>
                ) : (
                  stats.topItems.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link href={`/app/ims/items/${row.id}`}>{row.code}</Link>
                      </td>
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
            <Link href="/app/ims/movements">View all</Link>
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
                        {row.item.code} — {row.item.name}
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

      <section className="ws-ims-panel">
        <div className="ws-ims-panel-head">
          <h2>Sales order stock check</h2>
          <Link href={IMS_SALES_ORDER_STOCK_PATH}>Open queue</Link>
        </div>
        <ImsSalesOrderStockList orders={stockOrders.orders} />
      </section>

      {hasMinimumRole(user.role, "ADMIN") ? (
        <ImsTeamAccessPanel membersMissingIms={membersMissingIms} />
      ) : null}
    </div>
  );
}
