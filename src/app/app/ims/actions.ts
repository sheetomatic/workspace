"use server";

import type {
  ImsAbcClass,
  ImsItemType,
  ImsMovementType,
  ImsQcPolicy,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import {
  recordStockMovement,
  resolveQcInspection,
  upsertImsItem,
} from "@/lib/ims/ims-store";

export type ImsActionState = {
  ok: boolean;
  message: string;
};

const IMS_PATHS = [
  "/app/ims",
  "/app/ims/items",
  "/app/ims/stock",
  "/app/ims/move",
  "/app/ims/qc",
];

function revalidateIms() {
  for (const path of IMS_PATHS) {
    revalidatePath(path);
  }
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value?.toString() ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function saveImsItemAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const id = formData.get("id")?.toString() || undefined;

    await upsertImsItem(user.organizationId, {
      id,
      code: formData.get("code")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      description: formData.get("description")?.toString(),
      uom: formData.get("uom")?.toString() ?? "pcs",
      category: formData.get("category")?.toString(),
      itemType: formData.get("itemType")?.toString() as ImsItemType,
      abcClass: formData.get("abcClass")?.toString() as ImsAbcClass,
      unitCost: parseNumber(formData.get("unitCost")),
      minQty: parseNumber(formData.get("minQty")),
      reorderQty: parseNumber(formData.get("reorderQty")),
      maxQty: parseNumber(formData.get("maxQty")),
      qcOnReceipt: formData.get("qcOnReceipt")?.toString() as ImsQcPolicy,
      isActive: formData.get("isActive") === "on",
    });

    revalidateIms();
    return { ok: true, message: id ? "Item updated." : "Item created." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not save item.",
    };
  }
}

export async function recordMovementAction(formData: FormData) {
  const user = await requireSession(undefined, { module: "IMS" });
  const movementType = formData.get("movementType")?.toString() as ImsMovementType;
  const qcRequiredChoice = formData.get("qcRequired")?.toString() === "yes";

  await recordStockMovement({
    organizationId: user.organizationId,
    userId: user.id,
    itemId: formData.get("itemId")?.toString() ?? "",
    movementType,
    quantity: parseNumber(formData.get("quantity")),
    reference: formData.get("reference")?.toString(),
    notes: formData.get("notes")?.toString(),
    qcRequiredChoice,
  });

  revalidateIms();
}

export async function resolveQcAction(formData: FormData) {
  const user = await requireSession(undefined, { module: "IMS" });
  const pass = formData.get("decision")?.toString() === "pass";

  await resolveQcInspection({
    organizationId: user.organizationId,
    userId: user.id,
    inspectionId: formData.get("inspectionId")?.toString() ?? "",
    pass,
    notes: formData.get("notes")?.toString(),
  });

  revalidateIms();
}
