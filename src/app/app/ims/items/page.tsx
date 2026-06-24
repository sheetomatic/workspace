import { PageHeader } from "@/components/saas/page-header";
import { ImsItemForm } from "@/components/ims/ims-item-form";
import { requireSession } from "@/lib/require-session";
import { listImsItems } from "@/lib/ims/ims-store";
import { formatImsCurrency, formatImsQty } from "@/lib/ims/stock-status";

export default async function ImsItemsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const items = await listImsItems(user.organizationId, false);

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Item master"
        description="Define raw materials and finished goods with min, reorder, max, cost, ABC, and QC policy."
      />

      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <h2>Add item</h2>
          <ImsItemForm />
        </section>

        <section className="ws-ims-panel ws-ims-panel-wide">
          <h2>All items ({items.length})</h2>
          <div className="ws-ims-table-wrap">
            <table className="ws-ims-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>ABC</th>
                  <th>Min / Reorder / Max</th>
                  <th>Cost</th>
                  <th>QC</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8}>No items yet.</td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.code}</td>
                      <td>{item.name}</td>
                      <td>{item.itemType === "RAW_MATERIAL" ? "RM" : "FG"}</td>
                      <td>{item.abcClass}</td>
                      <td>
                        {formatImsQty(Number(item.minQty))} /{" "}
                        {formatImsQty(Number(item.reorderQty))} /{" "}
                        {formatImsQty(Number(item.maxQty))}
                      </td>
                      <td>{formatImsCurrency(Number(item.unitCost))}</td>
                      <td>{item.qcOnReceipt}</td>
                      <td>{item.isActive ? "Active" : "Inactive"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {items.length > 0 ? (
        <section className="ws-ims-panel">
          <h2>Edit item</h2>
          <p className="ws-ims-help">Expand an item to update thresholds, cost, or QC policy.</p>
          <div className="ws-ims-edit-list">
            {items.map((item) => (
              <details key={item.id} className="ws-ims-edit-item">
                <summary>
                  {item.code} ÿ {item.name}
                  {!item.isActive ? " (inactive)" : ""}
                </summary>
                <ImsItemForm item={item} />
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
