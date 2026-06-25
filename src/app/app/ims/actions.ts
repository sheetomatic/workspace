"use server";

import type {
  ImsAbcClass,
  ImsCustomFieldType,
  ImsFormEntity,
  ImsItemType,
  ImsMovementType,
  ImsQcPolicy,
  WorkspaceModule,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { requireSession } from "@/lib/require-session";
import {
  deleteImsCustomField,
  deleteImsItem,
  deleteImsVendor,
  importImsItems,
  importImsVendors,
  recordGoodsReceipt,
  recordStockMovement,
  reorderImsCustomField,
  reorderImsItem,
  reorderImsVendor,
  resolveQcInspection,
  saveImsFieldSettings,
  upsertImsCustomField,
  upsertImsItem,
  upsertImsVendor,
  type GoodsReceiptLine,
  type ImsItemImportRow,
  type ImsVendorImportRow,
} from "@/lib/ims/ims-store";
import { slugifyFieldKey } from "@/lib/ims/form-fields";
import { resolveMemberModules } from "@/lib/workspace-modules";

export type ImsActionState = {
  ok: boolean;
  message: string;
};

const IMS_PATHS = [
  "/app/ims",
  "/app/ims/items",
  "/app/ims/vendors",
  "/app/ims/settings",
  "/app/ims/stock",
  "/app/ims/move",
  "/app/ims/movements",
  "/app/ims/qc",
];

function revalidateIms() {
  for (const path of IMS_PATHS) {
    revalidatePath(path);
  }
  revalidatePath("/app/team");
}

function parseNumber(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value?.toString() ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseIsActive(formData: FormData) {
  return formData.getAll("isActive").some((value) => value.toString() === "on");
}

/** Collect custom field values (form inputs named cf_<key>) into an object. */
function collectCustomValues(formData: FormData): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("cf_")) {
      values[key.slice(3)] = value.toString();
    }
  }
  return values;
}

function actionError(error: unknown, fallback: string): ImsActionState {
  return {
    ok: false,
    message: error instanceof Error ? error.message : fallback,
  };
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
      isActive: parseIsActive(formData),
      customValues: collectCustomValues(formData),
    });

    revalidateIms();
    return { ok: true, message: id ? "Item updated." : "Item created." };
  } catch (error) {
    return actionError(error, "Could not save item.");
  }
}

export async function deleteImsItemAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const item = await deleteImsItem(
      user.organizationId,
      formData.get("id")?.toString() ?? "",
    );
    revalidateIms();
    return { ok: true, message: `Deleted ${item.code}.` };
  } catch (error) {
    return actionError(error, "Could not delete item.");
  }
}

export async function moveImsItemAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const direction =
      formData.get("direction")?.toString() === "up" ? "up" : "down";
    await reorderImsItem(
      user.organizationId,
      formData.get("id")?.toString() ?? "",
      direction,
    );
    revalidateIms();
    return { ok: true, message: "Order updated." };
  } catch (error) {
    return actionError(error, "Could not reorder item.");
  }
}

export async function importImsItemsAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });

    let rows: ImsItemImportRow[] = [];
    try {
      rows = JSON.parse(formData.get("rows")?.toString() ?? "[]");
    } catch {
      return { ok: false, message: "Could not read the rows to import." };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, message: "No valid rows to import." };
    }

    const result = await importImsItems(user.organizationId, rows);
    revalidateIms();
    return {
      ok: true,
      message: `Imported ${result.total} item${
        result.total === 1 ? "" : "s"
      } (${result.created} created, ${result.updated} updated).`,
    };
  } catch (error) {
    return actionError(error, "Could not import items.");
  }
}

/* ------------------------------ Vendors ------------------------------ */

export async function saveImsVendorAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const id = formData.get("id")?.toString() || undefined;

    const leadTimeRaw = formData.get("leadTimeDays")?.toString() ?? "";

    await upsertImsVendor(user.organizationId, {
      id,
      code: formData.get("code")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
      contactName: formData.get("contactName")?.toString(),
      email: formData.get("email")?.toString(),
      phone: formData.get("phone")?.toString(),
      address: formData.get("address")?.toString(),
      gstin: formData.get("gstin")?.toString(),
      paymentTerms: formData.get("paymentTerms")?.toString(),
      leadTimeDays: leadTimeRaw.trim() === "" ? null : parseNumber(formData.get("leadTimeDays")),
      notes: formData.get("notes")?.toString(),
      isActive: parseIsActive(formData),
      customValues: collectCustomValues(formData),
    });

    revalidateIms();
    return { ok: true, message: id ? "Vendor updated." : "Vendor created." };
  } catch (error) {
    return actionError(error, "Could not save vendor.");
  }
}

export async function deleteImsVendorAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const vendor = await deleteImsVendor(
      user.organizationId,
      formData.get("id")?.toString() ?? "",
    );
    revalidateIms();
    return { ok: true, message: `Deleted ${vendor.code}.` };
  } catch (error) {
    return actionError(error, "Could not delete vendor.");
  }
}

export async function moveImsVendorAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const direction =
      formData.get("direction")?.toString() === "up" ? "up" : "down";
    await reorderImsVendor(
      user.organizationId,
      formData.get("id")?.toString() ?? "",
      direction,
    );
    revalidateIms();
    return { ok: true, message: "Order updated." };
  } catch (error) {
    return actionError(error, "Could not reorder vendor.");
  }
}

export async function importImsVendorsAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });

    let rows: ImsVendorImportRow[] = [];
    try {
      rows = JSON.parse(formData.get("rows")?.toString() ?? "[]");
    } catch {
      return { ok: false, message: "Could not read the rows to import." };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, message: "No valid rows to import." };
    }

    const result = await importImsVendors(user.organizationId, rows);
    revalidateIms();
    return {
      ok: true,
      message: `Imported ${result.total} vendor${
        result.total === 1 ? "" : "s"
      } (${result.created} created, ${result.updated} updated).`,
    };
  } catch (error) {
    return actionError(error, "Could not import vendors.");
  }
}

/* ----------------------- Customisable form admin ----------------------- */

function parseFormEntity(formData: FormData): ImsFormEntity {
  return formData.get("entity")?.toString() === "VENDOR" ? "VENDOR" : "ITEM";
}

export async function saveImsCustomFieldAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const id = formData.get("id")?.toString() || undefined;
    const entity = parseFormEntity(formData);
    const label = formData.get("label")?.toString() ?? "";
    const fieldType =
      (formData.get("fieldType")?.toString() as ImsCustomFieldType) ?? "TEXT";

    const optionsRaw = formData.get("options")?.toString() ?? "";
    const options = optionsRaw
      .split(/[\n,]/)
      .map((opt) => opt.trim())
      .filter(Boolean);

    await upsertImsCustomField(user.organizationId, {
      id,
      entity,
      key: slugifyFieldKey(label),
      label,
      fieldType,
      options,
      required: formData.get("required")?.toString() === "on",
      helpText: formData.get("helpText")?.toString(),
    });

    revalidateIms();
    return { ok: true, message: id ? "Custom field updated." : "Custom field added." };
  } catch (error) {
    return actionError(error, "Could not save custom field.");
  }
}

export async function deleteImsCustomFieldAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    await deleteImsCustomField(
      user.organizationId,
      formData.get("id")?.toString() ?? "",
    );
    revalidateIms();
    return { ok: true, message: "Custom field deleted." };
  } catch (error) {
    return actionError(error, "Could not delete custom field.");
  }
}

export async function moveImsCustomFieldAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const direction =
      formData.get("direction")?.toString() === "up" ? "up" : "down";
    await reorderImsCustomField(
      user.organizationId,
      formData.get("id")?.toString() ?? "",
      direction,
    );
    revalidateIms();
    return { ok: true, message: "Order updated." };
  } catch (error) {
    return actionError(error, "Could not reorder custom field.");
  }
}

export async function saveImsFieldSettingsAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("MANAGER", { module: "IMS" });
    const entity = parseFormEntity(formData);

    let settings: Array<{
      fieldKey: string;
      label?: string | null;
      hidden: boolean;
      sortOrder: number;
    }> = [];
    try {
      const parsed = JSON.parse(formData.get("settings")?.toString() ?? "[]");
      if (Array.isArray(parsed)) {
        settings = parsed.map((row) => ({
          fieldKey: String(row.fieldKey),
          label:
            row.label === null || row.label === undefined
              ? null
              : String(row.label),
          hidden: Boolean(row.hidden),
          sortOrder: Number(row.sortOrder) || 0,
        }));
      }
    } catch {
      return { ok: false, message: "Could not read the field settings." };
    }

    await saveImsFieldSettings(user.organizationId, entity, settings);
    revalidateIms();
    return { ok: true, message: "Form layout saved." };
  } catch (error) {
    return actionError(error, "Could not save the form layout.");
  }
}

export async function recordReceiptAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession(undefined, { module: "IMS" });

    let lines: GoodsReceiptLine[] = [];
    try {
      const raw = formData.get("lines")?.toString() ?? "[]";
      const parsed = JSON.parse(raw) as Array<{
        itemId?: string;
        quantityReceived?: number | string;
        quantityOrdered?: number | string;
        qcHold?: boolean;
      }>;
      lines = parsed
        .filter((line) => line.itemId)
        .map((line) => ({
          itemId: String(line.itemId),
          quantityReceived: Number(line.quantityReceived) || 0,
          quantityOrdered:
            line.quantityOrdered !== undefined && line.quantityOrdered !== ""
              ? Number(line.quantityOrdered)
              : undefined,
          qcHold: Boolean(line.qcHold),
        }));
    } catch {
      return { ok: false, message: "Could not read the item lines." };
    }

    const result = await recordGoodsReceipt({
      organizationId: user.organizationId,
      userId: user.id,
      poNumber: formData.get("poNumber")?.toString(),
      supplierName: formData.get("supplierName")?.toString(),
      reference: formData.get("reference")?.toString(),
      invoiceNumber: formData.get("invoiceNumber")?.toString(),
      invoiceDate: formData.get("invoiceDate")?.toString() || undefined,
      invoiceAmount: parseNumber(formData.get("invoiceAmount")),
      attachmentId: formData.get("attachmentId")?.toString() || undefined,
      notes: formData.get("notes")?.toString(),
      lines,
    });

    revalidateIms();
    const qcNote =
      result.qcCount > 0
        ? ` ${result.qcCount} line${result.qcCount === 1 ? "" : "s"} held for QC.`
        : "";
    return {
      ok: true,
      message: `Receipt recorded for ${result.created} item${
        result.created === 1 ? "" : "s"
      }.${qcNote}`,
    };
  } catch (error) {
    return actionError(error, "Could not record the receipt.");
  }
}

export async function recordMovementAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
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
      quantityOrdered: parseNumber(formData.get("quantityOrdered")),
      poNumber: formData.get("poNumber")?.toString(),
      supplierName: formData.get("supplierName")?.toString(),
      invoiceNumber: formData.get("invoiceNumber")?.toString(),
      invoiceDate: formData.get("invoiceDate")?.toString() || undefined,
      invoiceAmount: parseNumber(formData.get("invoiceAmount")),
      attachmentId: formData.get("attachmentId")?.toString() || undefined,
    });

    revalidateIms();
    const label = movementType.replaceAll("_", " ").toLowerCase();
    return { ok: true, message: `Recorded ${label}.` };
  } catch (error) {
    return actionError(error, "Could not record movement.");
  }
}

export async function recordAdjustmentAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
    const user = await requireSession(undefined, { module: "IMS" });
    const direction = formData.get("direction")?.toString();
    const magnitude = Math.abs(parseNumber(formData.get("quantity")));

    if (magnitude <= 0) {
      return { ok: false, message: "Enter a quantity greater than zero." };
    }

    const signed = direction === "decrease" ? -magnitude : magnitude;

    await recordStockMovement({
      organizationId: user.organizationId,
      userId: user.id,
      itemId: formData.get("itemId")?.toString() ?? "",
      movementType: "ADJUSTMENT",
      quantity: signed,
      reference: formData.get("reference")?.toString(),
      notes: formData.get("notes")?.toString(),
    });

    revalidateIms();
    return {
      ok: true,
      message:
        direction === "decrease"
          ? `Decreased stock by ${magnitude}.`
          : `Increased stock by ${magnitude}.`,
    };
  } catch (error) {
    return actionError(error, "Could not record adjustment.");
  }
}

export async function resolveQcAction(
  _prev: ImsActionState,
  formData: FormData,
): Promise<ImsActionState> {
  try {
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
    return {
      ok: true,
      message: pass ? "QC passed - stock moved to usable." : "QC failed - stock scrapped.",
    };
  } catch (error) {
    return actionError(error, "Could not resolve QC inspection.");
  }
}

function shouldGrantImsByRole(role: import("@prisma/client").Role) {
  return hasMinimumRole(role, "STAFF");
}

export async function enableImsModuleForTeamAction(
  _prev: ImsActionState,
): Promise<ImsActionState> {
  try {
    const user = await requireSession("ADMIN", { module: "IMS" });

    const memberships = await prisma.membership.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, role: true, modules: true },
    });

    let updated = 0;

    for (const membership of memberships) {
      if (!shouldGrantImsByRole(membership.role)) {
        continue;
      }

      const current = resolveMemberModules(membership.role, membership.modules);
      if (current.includes("IMS")) {
        continue;
      }

      const next: WorkspaceModule[] = [...current, "IMS"];
      await prisma.membership.update({
        where: { id: membership.id },
        data: { modules: next },
      });
      updated += 1;
    }

    revalidateIms();

    return {
      ok: true,
      message:
        updated === 0
          ? "All team members already have IMS access."
          : `Enabled IMS for ${updated} team member${updated === 1 ? "" : "s"}.`,
    };
  } catch (error) {
    return actionError(error, "Could not enable IMS for the team.");
  }
}
