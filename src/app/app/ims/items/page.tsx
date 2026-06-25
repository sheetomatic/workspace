import { PageHeader } from "@/components/saas/page-header";
import { ImsItemForm } from "@/components/ims/ims-item-form";
import { ImsItemsManager } from "@/components/ims/ims-items-manager";
import { ImsItemImport } from "@/components/ims/ims-item-import";
import type { ImsItemFormData } from "@/components/ims/ims-item-form";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { listImsItems } from "@/lib/ims/ims-store";

export default async function ImsItemsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const items = await listImsItems(user.organizationId, false);

  const formItems: ImsItemFormData[] = items.map((item) => ({
    id: item.id,
    code: item.code,
    name: item.name,
    description: item.description,
    uom: item.uom,
    category: item.category,
    itemType: item.itemType,
    abcClass: item.abcClass,
    unitCost: Number(item.unitCost),
    minQty: Number(item.minQty),
    reorderQty: Number(item.reorderQty),
    maxQty: Number(item.maxQty),
    qcOnReceipt: item.qcOnReceipt,
    isActive: item.isActive,
  }));

  const canManage = hasMinimumRole(user.role, "MANAGER");

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Item master"
        description="Define raw materials and finished goods with min, reorder, max, cost, ABC, and QC policy."
      />

      {canManage ? <ImsItemImport /> : null}

      <div className="ws-ims-split">
        <section className="ws-ims-panel">
          <h2>Add item</h2>
          <ImsItemForm />
        </section>

        <section className="ws-ims-panel ws-ims-panel-wide">
          <h2>All items ({items.length})</h2>
          <ImsItemsManager items={formItems} />
        </section>
      </div>
    </div>
  );
}
