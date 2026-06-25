"use server";

import type {
  ImsAbcClass,
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
  recordStockMovement,
  resolveQcInspection,
  upsertImsItem,
} from "@/lib/ims/ims-store";
import { resolveMemberModules } from "@/lib/workspace-modules";

export type ImsActionState = {
  ok: boolean;
  message: string;
};

const IMS_PATHS = [
  "/app/ims",
  "/app/ims/items",
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
    });

    revalidateIms();
    return { ok: true, message: id ? "Item updated." : "Item created." };
  } catch (error) {
    return actionError(error, "Could not save item.");
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
