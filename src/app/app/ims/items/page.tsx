import { PageHeader } from "@/components/saas/page-header";
import { ImsItemForm } from "@/components/ims/ims-item-form";
import { ImsItemsManager } from "@/components/ims/ims-items-manager";
import { ImsItemImport } from "@/components/ims/ims-item-import";
import type { ImsItemFormData } from "@/components/ims/ims-item-form";
import { requireSession } from "@/lib/require-session";
import { hasMinimumRole } from "@/lib/permissions";
import { getImsFormConfig, listImsItems } from "@/lib/ims/ims-store";
import { resolveFormLayout } from "@/lib/ims/form-fields";

export default async function ImsItemsPage() {
  const user = await requireSession(undefined, { module: "IMS" });
  const [items, formConfig] = await Promise.all([
    listImsItems(user.organizationId, false),
    getImsFormConfig(user.organizationId, "ITEM"),
  ]);

  const layout = resolveFormLayout(
    "ITEM",
    formConfig.fieldSettings,
    formConfig.customFields,
  );

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
    customValues: (item.customValues as Record<string, unknown> | null) ?? null,
  }));

  const canManage = hasMinimumRole(user.role, "MANAGER");

  const categoryOptions = Array.from(
    new Set(
      formItems
        .map((item) => item.category?.trim())
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();

  return (
    <div className="saas-page ws-ims-page">
      <PageHeader
        title="Item master"
        description="Define raw materials and finished goods with min, reorder, max, cost, ABC, and QC policy."
      />

      {canManage ? <ImsItemImport /> : null}

      <div className="ws-ims-stack">
        {canManage ? (
          <section className="ws-ims-panel">
            <h2>Add item</h2>
            <ImsItemForm layout={layout} categoryOptions={categoryOptions} />
          </section>
        ) : null}

        <section className="ws-ims-panel">
          <h2>All items ({items.length})</h2>
          <ImsItemsManager
            items={formItems}
            layout={layout}
            canManage={canManage}
            categoryOptions={categoryOptions}
          />
        </section>
      </div>
    </div>
  );
}
