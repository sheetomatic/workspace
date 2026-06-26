import { PageHeader } from "@/components/saas/page-header";
import {
  ImsMovementsTable,
  type MovementRow,
} from "@/components/ims/ims-movements-table";
import { requireSession } from "@/lib/require-session";
import { countMovements, listMovements } from "@/lib/ims/ims-store";

const MOVEMENT_FETCH_CAP = 2000;

export default async function ImsMovementsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [movements, totalCount] = await Promise.all([
    listMovements(user.organizationId, { take: MOVEMENT_FETCH_CAP }),
    countMovements(user.organizationId),
  ]);

  const rows: MovementRow[] = movements.map((row) => ({
    id: row.id,
    itemId: row.itemId,
    createdAt: row.createdAt.toISOString(),
    movementType: row.movementType,
    itemCode: row.item.code,
    itemName: row.item.name,
    uom: row.item.uom,
    quantity: Number(row.quantity),
    reference: row.reference,
    poNumber: row.poNumber,
    supplierName: row.supplierName,
    invoiceNumber: row.invoiceNumber,
    attachmentId: row.attachmentId,
    by: row.createdBy?.name ?? row.createdBy?.email ?? "-",
  }));

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Movement history"
        description="Every stock movement - receipts, issues, dispatches, and adjustments. Filter by type or search."
      />

      <ImsMovementsTable rows={rows} totalCount={totalCount} />
    </div>
  );
}
