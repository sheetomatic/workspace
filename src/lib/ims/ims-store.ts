import type {
  ImsAbcClass,
  ImsItemType,
  ImsMovementType,
  ImsQcPolicy,
  ImsStoreType,
  Prisma,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { prisma } from "@/lib/db";
import { hasMinimumRole } from "@/lib/permissions";
import { resolveMemberModules } from "@/lib/workspace-modules";
import { computeStockStatus } from "@/lib/ims/stock-status";
import {
  assertUniqueImsItemCode,
  validateImsItemInput,
} from "@/lib/ims/validation";

function dec(value: number | string): Decimal {
  return new Decimal(value);
}

function num(value: Decimal | null | undefined): number {
  if (!value) {
    return 0;
  }
  return Number(value);
}

export function storeTypeForItemType(itemType: ImsItemType): ImsStoreType {
  return itemType === "FINISHED_GOOD" ? "FG" : "RM";
}

async function adjustBalance(
  tx: Prisma.TransactionClient,
  organizationId: string,
  itemId: string,
  storeType: ImsStoreType,
  bucket: "USABLE" | "QC_PENDING",
  delta: Decimal,
) {
  const existing = await tx.imsStockBalance.findUnique({
    where: {
      organizationId_itemId_storeType_bucket: {
        organizationId,
        itemId,
        storeType,
        bucket,
      },
    },
  });

  const current = existing?.quantity ?? dec(0);
  const next = current.add(delta);

  if (next.lt(0)) {
    throw new Error("Insufficient stock for this movement.");
  }

  if (existing) {
    await tx.imsStockBalance.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
    return;
  }

  await tx.imsStockBalance.create({
    data: {
      organizationId,
      itemId,
      storeType,
      bucket,
      quantity: next,
    },
  });
}

export async function listImsItems(organizationId: string, activeOnly = true) {
  return prisma.imsItem.findMany({
    where: {
      organizationId,
      ...(activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { itemType: "asc" }, { code: "asc" }],
  });
}

export async function upsertImsItem(
  organizationId: string,
  data: {
    id?: string;
    code: string;
    name: string;
    description?: string;
    uom: string;
    category?: string;
    itemType: ImsItemType;
    abcClass: ImsAbcClass;
    unitCost: number;
    minQty: number;
    reorderQty: number;
    maxQty: number;
    qcOnReceipt: ImsQcPolicy;
    isActive: boolean;
  },
) {
  validateImsItemInput({
    code: data.code,
    name: data.name,
    minQty: data.minQty,
    reorderQty: data.reorderQty,
    maxQty: data.maxQty,
    unitCost: data.unitCost,
  });

  const payload = {
    code: data.code.trim().toUpperCase(),
    name: data.name.trim(),
    description: data.description?.trim() || null,
    uom: data.uom.trim() || "pcs",
    category: data.category?.trim() || null,
    itemType: data.itemType,
    abcClass: data.abcClass,
    unitCost: dec(data.unitCost),
    minQty: dec(data.minQty),
    reorderQty: dec(data.reorderQty),
    maxQty: dec(data.maxQty),
    qcOnReceipt: data.qcOnReceipt,
    isActive: data.isActive,
  };

  if (data.id) {
    await assertUniqueImsItemCode(organizationId, payload.code, data.id);
    return prisma.imsItem.update({
      where: { id: data.id, organizationId },
      data: payload,
    });
  }

  await assertUniqueImsItemCode(organizationId, payload.code);
  const last = await prisma.imsItem.findFirst({
    where: { organizationId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  return prisma.imsItem.create({
    data: {
      organizationId,
      ...payload,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });
}

/** Delete an item, but only if it has no stock balances or movements. */
export async function deleteImsItem(organizationId: string, itemId: string) {
  const item = await prisma.imsItem.findFirst({
    where: { id: itemId, organizationId },
    select: { id: true, code: true },
  });
  if (!item) {
    throw new Error("Item not found.");
  }

  const [movementCount, balanceCount] = await Promise.all([
    prisma.imsStockMovement.count({ where: { organizationId, itemId } }),
    prisma.imsStockBalance.count({ where: { organizationId, itemId } }),
  ]);

  if (movementCount > 0 || balanceCount > 0) {
    throw new Error(
      "This item has stock or movement history and cannot be deleted. Deactivate it instead.",
    );
  }

  await prisma.imsItem.delete({ where: { id: itemId, organizationId } });
  return item;
}

/** Move an item up or down in the manual sort order by swapping with its neighbour. */
export async function reorderImsItem(
  organizationId: string,
  itemId: string,
  direction: "up" | "down",
) {
  const items = await prisma.imsItem.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { itemType: "asc" }, { code: "asc" }],
    select: { id: true, sortOrder: true },
  });

  const index = items.findIndex((row) => row.id === itemId);
  if (index === -1) {
    throw new Error("Item not found.");
  }

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= items.length) {
    return;
  }

  // Normalise sortOrder values (they may collide) using array position, then swap.
  const current = items[index];
  const neighbour = items[swapWith];

  await prisma.$transaction([
    prisma.imsItem.update({
      where: { id: current.id, organizationId },
      data: { sortOrder: swapWith + 1 },
    }),
    prisma.imsItem.update({
      where: { id: neighbour.id, organizationId },
      data: { sortOrder: index + 1 },
    }),
  ]);
}

export type ImsItemImportRow = {
  code: string;
  name: string;
  description?: string;
  uom?: string;
  category?: string;
  itemType: ImsItemType;
  abcClass: ImsAbcClass;
  unitCost: number;
  minQty: number;
  reorderQty: number;
  maxQty: number;
  qcOnReceipt: ImsQcPolicy;
  isActive: boolean;
};

/** Bulk create-or-update items by code. Returns counts. */
export async function importImsItems(
  organizationId: string,
  rows: ImsItemImportRow[],
) {
  let created = 0;
  let updated = 0;

  const last = await prisma.imsItem.findFirst({
    where: { organizationId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });
  let nextSort = (last?.sortOrder ?? 0) + 1;

  for (const row of rows) {
    validateImsItemInput({
      code: row.code,
      name: row.name,
      minQty: row.minQty,
      reorderQty: row.reorderQty,
      maxQty: row.maxQty,
      unitCost: row.unitCost,
    });

    const code = row.code.trim().toUpperCase();
    const payload = {
      name: row.name.trim(),
      description: row.description?.trim() || null,
      uom: row.uom?.trim() || "pcs",
      category: row.category?.trim() || null,
      itemType: row.itemType,
      abcClass: row.abcClass,
      unitCost: dec(row.unitCost),
      minQty: dec(row.minQty),
      reorderQty: dec(row.reorderQty),
      maxQty: dec(row.maxQty),
      qcOnReceipt: row.qcOnReceipt,
      isActive: row.isActive,
    };

    const existing = await prisma.imsItem.findFirst({
      where: { organizationId, code },
      select: { id: true },
    });

    if (existing) {
      await prisma.imsItem.update({
        where: { id: existing.id, organizationId },
        data: payload,
      });
      updated += 1;
    } else {
      await prisma.imsItem.create({
        data: { organizationId, code, ...payload, sortOrder: nextSort },
      });
      nextSort += 1;
      created += 1;
    }
  }

  return { created, updated, total: rows.length };
}

export async function getStockRows(
  organizationId: string,
  options?: { includeInactiveWithBalance?: boolean },
) {
  const includeInactive = options?.includeInactiveWithBalance ?? true;
  const items = await listImsItems(organizationId, false);
  const balances = await prisma.imsStockBalance.findMany({
    where: { organizationId },
  });

  const balanceMap = new Map<string, { usable: number; qcPending: number }>();

  for (const row of balances) {
    const key = `${row.itemId}:${row.storeType}`;
    const current = balanceMap.get(key) ?? { usable: 0, qcPending: 0 };
    if (row.bucket === "USABLE") {
      current.usable = num(row.quantity);
    } else {
      current.qcPending = num(row.quantity);
    }
    balanceMap.set(key, current);
  }

  return items
    .map((item) => {
      const storeType = storeTypeForItemType(item.itemType);
      const key = `${item.id}:${storeType}`;
      const buckets = balanceMap.get(key) ?? { usable: 0, qcPending: 0 };
      const status = computeStockStatus({
        usableQty: buckets.usable,
        minQty: num(item.minQty),
        reorderQty: num(item.reorderQty),
        maxQty: num(item.maxQty),
      });
      const value = buckets.usable * num(item.unitCost);

      return {
        item,
        storeType,
        usableQty: buckets.usable,
        qcPendingQty: buckets.qcPending,
        status,
        value,
      };
    })
    .filter((row) => {
      if (row.item.isActive) {
        return true;
      }
      if (!includeInactive) {
        return false;
      }
      return row.usableQty !== 0 || row.qcPendingQty !== 0;
    });
}

/** Map of itemId -> usable quantity in its own store, for movement hints. */
export async function getUsableQtyMap(organizationId: string) {
  const balances = await prisma.imsStockBalance.findMany({
    where: { organizationId, bucket: "USABLE" },
    select: { itemId: true, quantity: true },
  });
  const map: Record<string, number> = {};
  for (const row of balances) {
    map[row.itemId] = (map[row.itemId] ?? 0) + num(row.quantity);
  }
  return map;
}

export async function listImsCategories(organizationId: string) {
  const rows = await prisma.imsItem.findMany({
    where: { organizationId, category: { not: null } },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows
    .map((row) => row.category?.trim())
    .filter((value): value is string => Boolean(value));
}

export async function getImsDashboardStats(organizationId: string) {
  const rows = await getStockRows(organizationId);
  const statusCounts = { red: 0, orange: 0, green: 0, blue: 0 };
  const abcValue: Record<ImsAbcClass, number> = { A: 0, B: 0, C: 0 };
  let totalValue = 0;
  let pendingQcUnits = 0;

  for (const row of rows) {
    totalValue += row.value;
    statusCounts[row.status] += 1;
    abcValue[row.item.abcClass] += row.value;
    pendingQcUnits += row.qcPendingQty;
  }

  const [recentMovements, pendingQcCount] = await Promise.all([
    prisma.imsStockMovement.findMany({
      where: { organizationId },
      include: {
        item: { select: { code: true, name: true } },
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.imsQcInspection.count({
      where: { organizationId, status: "PENDING" },
    }),
  ]);

  const reorderList = rows
    .filter((row) => row.status === "red" || row.status === "orange")
    .sort((a, b) => a.usableQty - b.usableQty)
    .slice(0, 8)
    .map((row) => ({
      id: row.item.id,
      code: row.item.code,
      name: row.item.name,
      usableQty: row.usableQty,
      uom: row.item.uom,
      reorderQty: num(row.item.reorderQty),
      status: row.status,
    }));

  return {
    totalValue,
    itemCount: rows.length,
    statusCounts,
    abcValue,
    pendingQcUnits,
    pendingQcCount,
    reorderList,
    topItems: [...rows]
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((row) => ({
        id: row.item.id,
        code: row.item.code,
        name: row.item.name,
        value: row.value,
        status: row.status,
      })),
    recentMovements,
  };
}

export type ImsMovementFilters = {
  movementType?: ImsMovementType;
  itemId?: string;
  take?: number;
};

export async function listMovements(
  organizationId: string,
  filters: ImsMovementFilters = {},
) {
  return prisma.imsStockMovement.findMany({
    where: {
      organizationId,
      ...(filters.movementType ? { movementType: filters.movementType } : {}),
      ...(filters.itemId ? { itemId: filters.itemId } : {}),
    },
    include: {
      item: { select: { code: true, name: true, uom: true } },
      createdBy: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters.take ?? 200,
  });
}

export async function listQcHistory(organizationId: string, take = 100) {
  return prisma.imsQcInspection.findMany({
    where: { organizationId, status: { in: ["PASSED", "FAILED"] } },
    include: {
      item: { select: { code: true, name: true, uom: true } },
      inspectedBy: { select: { name: true, email: true } },
    },
    orderBy: { inspectedAt: "desc" },
    take,
  });
}

export async function getItemDetail(organizationId: string, itemId: string) {
  const item = await prisma.imsItem.findFirst({
    where: { id: itemId, organizationId },
  });

  if (!item) {
    return null;
  }

  const storeType = storeTypeForItemType(item.itemType);
  const [balances, movements, pendingQc] = await Promise.all([
    prisma.imsStockBalance.findMany({
      where: { organizationId, itemId },
    }),
    prisma.imsStockMovement.findMany({
      where: { organizationId, itemId },
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.imsQcInspection.count({
      where: { organizationId, itemId, status: "PENDING" },
    }),
  ]);

  let usableQty = 0;
  let qcPendingQty = 0;
  for (const row of balances) {
    if (row.bucket === "USABLE") {
      usableQty += num(row.quantity);
    } else {
      qcPendingQty += num(row.quantity);
    }
  }

  const status = computeStockStatus({
    usableQty,
    minQty: num(item.minQty),
    reorderQty: num(item.reorderQty),
    maxQty: num(item.maxQty),
  });

  return {
    item,
    storeType,
    usableQty,
    qcPendingQty,
    value: usableQty * num(item.unitCost),
    status,
    pendingQc,
    movements,
  };
}

export async function countManagersMissingIms(organizationId: string) {
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    select: { role: true, modules: true },
  });

  let missing = 0;
  for (const membership of memberships) {
    if (!hasMinimumRole(membership.role, "STAFF")) {
      continue;
    }
    const modules = resolveMemberModules(membership.role, membership.modules);
    if (!modules.includes("IMS")) {
      missing += 1;
    }
  }
  return missing;
}

export async function listPendingQc(organizationId: string) {
  return prisma.imsQcInspection.findMany({
    where: { organizationId, status: "PENDING" },
    include: {
      item: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

function resolveQcRequired(
  policy: ImsQcPolicy,
  userSelected?: boolean,
): boolean {
  if (policy === "ALWAYS") {
    return true;
  }
  if (policy === "OFF") {
    return false;
  }
  return Boolean(userSelected);
}

export async function recordStockMovement(params: {
  organizationId: string;
  userId: string;
  itemId: string;
  movementType: ImsMovementType;
  quantity: number;
  reference?: string;
  notes?: string;
  qcRequiredChoice?: boolean;
  quantityOrdered?: number;
  poNumber?: string;
  supplierName?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  attachmentId?: string;
}) {
  const isAdjustment = params.movementType === "ADJUSTMENT";

  if (isAdjustment) {
    if (params.quantity === 0 || !Number.isFinite(params.quantity)) {
      throw new Error("Adjustment quantity cannot be zero.");
    }
  } else if (params.quantity <= 0) {
    throw new Error("Quantity must be greater than zero.");
  }

  const item = await prisma.imsItem.findFirst({
    where: { id: params.itemId, organizationId: params.organizationId, isActive: true },
  });

  if (!item) {
    throw new Error("Item not found.");
  }

  const storeType = storeTypeForItemType(item.itemType);
  const qty = dec(params.quantity);

  if (params.movementType === "RM_IN" && item.itemType !== "RAW_MATERIAL") {
    throw new Error("RM In applies to raw material items only.");
  }
  if (params.movementType === "FG_IN" && item.itemType !== "FINISHED_GOOD") {
    throw new Error("FG In applies to finished goods only.");
  }
  if (params.movementType === "ISSUE_TO_PRODUCTION" && item.itemType !== "RAW_MATERIAL") {
    throw new Error("Issue to production applies to raw materials only.");
  }
  if (params.movementType === "FG_OUT" && item.itemType !== "FINISHED_GOOD") {
    throw new Error("FG Out applies to finished goods only.");
  }

  const isReceipt =
    params.movementType === "RM_IN" || params.movementType === "FG_IN";
  const qcRequired = isReceipt
    ? resolveQcRequired(item.qcOnReceipt, params.qcRequiredChoice)
    : false;

  return prisma.$transaction(async (tx) => {
    let qcInspectionId: string | undefined;

    if (isReceipt) {
      if (qcRequired) {
        const inspection = await tx.imsQcInspection.create({
          data: {
            organizationId: params.organizationId,
            itemId: item.id,
            storeType,
            quantity: qty,
            status: "PENDING",
          },
        });
        qcInspectionId = inspection.id;
        await adjustBalance(
          tx,
          params.organizationId,
          item.id,
          storeType,
          "QC_PENDING",
          qty,
        );
      } else {
        await adjustBalance(
          tx,
          params.organizationId,
          item.id,
          storeType,
          "USABLE",
          qty,
        );
      }
    } else if (params.movementType === "ISSUE_TO_PRODUCTION") {
      await adjustBalance(
        tx,
        params.organizationId,
        item.id,
        storeType,
        "USABLE",
        qty.neg(),
      );
    } else if (params.movementType === "FG_OUT") {
      await adjustBalance(
        tx,
        params.organizationId,
        item.id,
        storeType,
        "USABLE",
        qty.neg(),
      );
    } else if (isAdjustment) {
      await adjustBalance(
        tx,
        params.organizationId,
        item.id,
        storeType,
        "USABLE",
        qty,
      );
    }

    const invoiceDate = params.invoiceDate
      ? new Date(params.invoiceDate)
      : null;

    return tx.imsStockMovement.create({
      data: {
        organizationId: params.organizationId,
        itemId: item.id,
        movementType: params.movementType,
        storeType,
        quantity: qty,
        quantityOrdered:
          params.quantityOrdered && params.quantityOrdered > 0
            ? dec(params.quantityOrdered)
            : null,
        unitCost: item.unitCost,
        reference: params.reference?.trim() || null,
        notes: params.notes?.trim() || null,
        poNumber: params.poNumber?.trim() || null,
        supplierName: params.supplierName?.trim() || null,
        invoiceNumber: params.invoiceNumber?.trim() || null,
        invoiceDate:
          invoiceDate && !Number.isNaN(invoiceDate.getTime()) ? invoiceDate : null,
        invoiceAmount:
          params.invoiceAmount && params.invoiceAmount > 0
            ? dec(params.invoiceAmount)
            : null,
        attachmentId: params.attachmentId?.trim() || null,
        qcRequired,
        qcInspectionId,
        createdById: params.userId,
      },
    });
  });
}

export type GoodsReceiptLine = {
  itemId: string;
  quantityReceived: number;
  quantityOrdered?: number;
  qcHold?: boolean;
};

/** Multi-line raw-material goods receipt (GRN): one movement per line, shared header. */
export async function recordGoodsReceipt(params: {
  organizationId: string;
  userId: string;
  poNumber?: string;
  supplierName?: string;
  reference?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  invoiceAmount?: number;
  attachmentId?: string;
  notes?: string;
  lines: GoodsReceiptLine[];
}) {
  const lines = params.lines.filter(
    (line) => line.itemId && Number.isFinite(line.quantityReceived),
  );

  if (lines.length === 0) {
    throw new Error("Add at least one item line with a received quantity.");
  }

  for (const line of lines) {
    if (line.quantityReceived <= 0) {
      throw new Error("Each line needs a received quantity greater than zero.");
    }
  }

  const items = await prisma.imsItem.findMany({
    where: {
      organizationId: params.organizationId,
      id: { in: lines.map((line) => line.itemId) },
      isActive: true,
    },
  });
  const itemMap = new Map(items.map((item) => [item.id, item]));

  for (const line of lines) {
    const item = itemMap.get(line.itemId);
    if (!item) {
      throw new Error("One of the selected items was not found.");
    }
    if (item.itemType !== "RAW_MATERIAL") {
      throw new Error(`${item.code} is not a raw material.`);
    }
  }

  const invoiceDate = params.invoiceDate ? new Date(params.invoiceDate) : null;
  const invoiceAmount =
    params.invoiceAmount && params.invoiceAmount > 0
      ? dec(params.invoiceAmount)
      : null;

  return prisma.$transaction(async (tx) => {
    let created = 0;
    let qcCount = 0;

    for (const line of lines) {
      const item = itemMap.get(line.itemId)!;
      const storeType = storeTypeForItemType(item.itemType);
      const qty = dec(line.quantityReceived);
      const qcRequired = resolveQcRequired(item.qcOnReceipt, line.qcHold);

      let qcInspectionId: string | undefined;
      if (qcRequired) {
        const inspection = await tx.imsQcInspection.create({
          data: {
            organizationId: params.organizationId,
            itemId: item.id,
            storeType,
            quantity: qty,
            status: "PENDING",
          },
        });
        qcInspectionId = inspection.id;
        qcCount += 1;
        await adjustBalance(
          tx,
          params.organizationId,
          item.id,
          storeType,
          "QC_PENDING",
          qty,
        );
      } else {
        await adjustBalance(
          tx,
          params.organizationId,
          item.id,
          storeType,
          "USABLE",
          qty,
        );
      }

      await tx.imsStockMovement.create({
        data: {
          organizationId: params.organizationId,
          itemId: item.id,
          movementType: "RM_IN",
          storeType,
          quantity: qty,
          quantityOrdered:
            line.quantityOrdered && line.quantityOrdered > 0
              ? dec(line.quantityOrdered)
              : null,
          unitCost: item.unitCost,
          reference: params.reference?.trim() || null,
          notes: params.notes?.trim() || null,
          poNumber: params.poNumber?.trim() || null,
          supplierName: params.supplierName?.trim() || null,
          invoiceNumber: params.invoiceNumber?.trim() || null,
          invoiceDate:
            invoiceDate && !Number.isNaN(invoiceDate.getTime())
              ? invoiceDate
              : null,
          invoiceAmount,
          attachmentId: params.attachmentId?.trim() || null,
          qcRequired,
          qcInspectionId,
          createdById: params.userId,
        },
      });
      created += 1;
    }

    return { created, qcCount };
  });
}

export async function resolveQcInspection(params: {
  organizationId: string;
  userId: string;
  inspectionId: string;
  pass: boolean;
  notes?: string;
}) {
  const inspection = await prisma.imsQcInspection.findFirst({
    where: {
      id: params.inspectionId,
      organizationId: params.organizationId,
      status: "PENDING",
    },
    include: { item: true },
  });

  if (!inspection) {
    throw new Error("QC inspection not found or already resolved.");
  }

  const qty = inspection.quantity;

  return prisma.$transaction(async (tx) => {
    await adjustBalance(
      tx,
      params.organizationId,
      inspection.itemId,
      inspection.storeType,
      "QC_PENDING",
      qty.neg(),
    );

    if (params.pass) {
      await adjustBalance(
        tx,
        params.organizationId,
        inspection.itemId,
        inspection.storeType,
        "USABLE",
        qty,
      );
    }

    await tx.imsQcInspection.update({
      where: { id: inspection.id },
      data: {
        status: params.pass ? "PASSED" : "FAILED",
        notes: params.notes?.trim() || inspection.notes,
        inspectedById: params.userId,
        inspectedAt: new Date(),
      },
    });

    await tx.imsStockMovement.create({
      data: {
        organizationId: params.organizationId,
        itemId: inspection.itemId,
        movementType: params.pass ? "QC_PASS" : "QC_FAIL",
        storeType: inspection.storeType,
        quantity: qty,
        unitCost: inspection.item.unitCost,
        notes: params.notes?.trim() || null,
        qcRequired: true,
        createdById: params.userId,
      },
    });
  });
}
