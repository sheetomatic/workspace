"use client";

import { saveImsItemAction } from "@/app/app/ims/actions";
import { ImsDynamicForm } from "@/components/ims/ims-dynamic-form";
import type { FormLayout } from "@/lib/ims/form-fields";

export type ImsItemFormData = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  uom: string;
  category: string | null;
  itemType: "RAW_MATERIAL" | "FINISHED_GOOD";
  abcClass: "A" | "B" | "C";
  unitCost: number;
  minQty: number;
  reorderQty: number;
  maxQty: number;
  qcOnReceipt: "OFF" | "OPTIONAL" | "ALWAYS";
  isActive: boolean;
  customValues: Record<string, unknown> | null;
};

export function ImsItemForm({
  layout,
  item,
}: {
  layout: FormLayout;
  item?: ImsItemFormData;
}) {
  const builtinValues: Record<string, unknown> = item
    ? {
        code: item.code,
        name: item.name,
        itemType: item.itemType,
        uom: item.uom,
        category: item.category,
        abcClass: item.abcClass,
        unitCost: item.unitCost,
        minQty: item.minQty,
        reorderQty: item.reorderQty,
        maxQty: item.maxQty,
        qcOnReceipt: item.qcOnReceipt,
        description: item.description,
        isActive: item.isActive,
      }
    : {};

  return (
    <ImsDynamicForm
      layout={layout}
      recordId={item?.id}
      builtinValues={builtinValues}
      customValues={item?.customValues ?? {}}
      action={saveImsItemAction}
      submitLabel={item ? "Update item" : "Create item"}
    />
  );
}
