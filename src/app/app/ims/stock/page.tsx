import { PageHeader } from "@/components/saas/page-header";
import {
  ImsStockTable,
  type StockTableRow,
} from "@/components/ims/ims-stock-table";
import { requireSession } from "@/lib/require-session";
import { getStockRows } from "@/lib/ims/ims-store";

export default async function ImsStockPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const rows = await getStockRows(user.organizationId);

  const tableRows: StockTableRow[] = rows.map((row) => ({
    id: row.item.id,
    code: row.item.code,
    name: row.item.name,
    itemType: row.item.itemType,
    category: row.item.category,
    storeType: row.storeType,
    uom: row.item.uom,
    usableQty: row.usableQty,
    qcPendingQty: row.qcPendingQty,
    minQty: Number(row.item.minQty),
    reorderQty: Number(row.item.reorderQty),
    maxQty: Number(row.item.maxQty),
    value: row.value,
    status: row.status,
    isActive: row.item.isActive,
  }));

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Stock levels"
        description="Usable quantity drives alert colours. QC pending is shown separately. Inactive items still holding stock are included."
      />

      <ImsStockTable rows={tableRows} />
    </div>
  );
}
