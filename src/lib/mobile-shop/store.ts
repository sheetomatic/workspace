import "server-only";

import type {
  MobileShopItemKind,
  MobileShopMovementKind,
  MobileShopPhoneCondition,
  MobileShopRepairStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { matchPartForRepair } from "@/lib/mobile-shop/match-part";
import { parsePromisedAt } from "@/lib/mobile-shop/promised-at";
import {
  LOW_STOCK_MAX_QTY,
  startOfShopDay,
  summarizeShopDay,
} from "@/lib/mobile-shop/day-glance";

export const MOBILE_REPAIR_JOB_TYPES = [
  "Screen",
  "Battery",
  "Software",
  "Charging port",
  "Speaker / mic",
  "Camera",
  "Water damage",
  "Other",
] as const;

export const REPAIR_STATUS_ORDER: MobileShopRepairStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "READY",
  "DELIVERED",
];

export async function mobileShopDashboard(organizationId: string, now = new Date()) {
  const dayStart = startOfShopDay(now);
  const [movements, repairs, stockItems] = await Promise.all([
    prisma.mobileShopMovement.findMany({
      where: { organizationId, createdAt: { gte: dayStart } },
      select: {
        kind: true,
        qty: true,
        amountPaise: true,
        createdAt: true,
        item: { select: { kind: true, condition: true } },
      },
    }),
    prisma.mobileShopRepair.findMany({
      where: {
        organizationId,
        OR: [
          { createdAt: { gte: dayStart }, status: { not: "CANCELLED" } },
          { status: { in: ["RECEIVED", "IN_PROGRESS", "READY"] } },
          { status: "DELIVERED", updatedAt: { gte: dayStart } },
          {
            promisedAt: { lt: now },
            status: { notIn: ["DELIVERED", "CANCELLED"] },
          },
        ],
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        promisedAt: true,
        customerName: true,
        deviceName: true,
      },
    }),
    prisma.mobileShopItem.findMany({
      where: {
        organizationId,
        kind: { in: ["ACCESSORY", "PART"] },
        qty: { lte: LOW_STOCK_MAX_QTY },
      },
      orderBy: [{ qty: "asc" }, { name: "asc" }],
      take: 8,
      select: { id: true, name: true, kind: true, qty: true },
    }),
  ]);

  return summarizeShopDay({ now, movements, repairs, stockItems });
}

export async function listMobileShopItems(
  organizationId: string,
  kind?: MobileShopItemKind,
) {
  return prisma.mobileShopItem.findMany({
    where: { organizationId, ...(kind ? { kind } : {}) },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
}

export async function findPhoneByImei(organizationId: string, imei: string) {
  return prisma.mobileShopItem.findFirst({
    where: { organizationId, kind: "PHONE", imei },
  });
}

export async function stockInPhone(input: {
  organizationId: string;
  createdById: string;
  brand: string;
  model: string;
  imei: string;
  condition: MobileShopPhoneCondition;
  reason?: string;
  notes?: string;
}) {
  const imei = input.imei.trim();
  if (!imei) return { ok: false as const, message: "IMEI is required for phones." };
  const existing = await findPhoneByImei(input.organizationId, imei);
  if (existing && existing.qty > 0) {
    return { ok: false as const, message: "This IMEI is already in stock." };
  }
  const name = `${input.brand.trim()} ${input.model.trim()}`.trim();
  const item = existing
    ? await prisma.mobileShopItem.update({
        where: { id: existing.id },
        data: { qty: 1, condition: input.condition, name, brand: input.brand.trim(), model: input.model.trim() },
      })
    : await prisma.mobileShopItem.create({
        data: {
          organizationId: input.organizationId,
          kind: "PHONE",
          name,
          brand: input.brand.trim(),
          model: input.model.trim(),
          imei,
          condition: input.condition,
          qty: 1,
        },
      });
  await prisma.mobileShopMovement.create({
    data: {
      organizationId: input.organizationId,
      itemId: item.id,
      kind: "STOCK_IN",
      qty: 1,
      reason: input.reason?.trim() || "PURCHASE",
      notes: input.notes?.trim() || null,
      createdById: input.createdById,
    },
  });
  return { ok: true as const, item };
}

export async function stockInQtyItem(input: {
  organizationId: string;
  createdById: string;
  kind: "ACCESSORY" | "PART";
  name: string;
  qty: number;
  reason?: string;
  notes?: string;
}) {
  if (input.qty <= 0) return { ok: false as const, message: "Qty must be more than 0." };
  const name = input.name.trim();
  if (!name) return { ok: false as const, message: "Name is required." };
  let item = await prisma.mobileShopItem.findFirst({
    where: { organizationId: input.organizationId, kind: input.kind, name },
  });
  if (item) {
    item = await prisma.mobileShopItem.update({
      where: { id: item.id },
      data: { qty: item.qty + input.qty },
    });
  } else {
    item = await prisma.mobileShopItem.create({
      data: {
        organizationId: input.organizationId,
        kind: input.kind,
        name,
        qty: input.qty,
      },
    });
  }
  await prisma.mobileShopMovement.create({
    data: {
      organizationId: input.organizationId,
      itemId: item.id,
      kind: "STOCK_IN",
      qty: input.qty,
      reason: input.reason?.trim() || "PURCHASE",
      notes: input.notes?.trim() || null,
      createdById: input.createdById,
    },
  });
  return { ok: true as const, item };
}

async function decrementItem(
  organizationId: string,
  itemId: string,
  qty: number,
) {
  const item = await prisma.mobileShopItem.findFirst({
    where: { id: itemId, organizationId },
  });
  if (!item) return { ok: false as const, message: "Item not found." };
  if (item.qty < qty) return { ok: false as const, message: "Not enough stock." };
  const updated = await prisma.mobileShopItem.update({
    where: { id: item.id },
    data: { qty: item.qty - qty },
  });
  return { ok: true as const, item: updated };
}

export async function stockOut(input: {
  organizationId: string;
  createdById: string;
  itemId: string;
  qty: number;
  kind: Extract<MobileShopMovementKind, "STOCK_OUT" | "SALE" | "PART_TO_REPAIR">;
  reason?: string;
  amountPaise?: number;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  repairId?: string;
}) {
  if (input.qty <= 0) return { ok: false as const, message: "Qty must be more than 0." };
  const result = await decrementItem(input.organizationId, input.itemId, input.qty);
  if (!result.ok) return result;
  await prisma.mobileShopMovement.create({
    data: {
      organizationId: input.organizationId,
      itemId: input.itemId,
      kind: input.kind,
      qty: input.qty,
      reason: input.reason?.trim() || (input.kind === "SALE" ? "SALE" : input.kind === "PART_TO_REPAIR" ? "PART_USED" : "RETURN_TO_SUPPLIER"),
      amountPaise: input.amountPaise ?? 0,
      customerName: input.customerName?.trim() || null,
      customerPhone: input.customerPhone?.trim() || null,
      notes: input.notes?.trim() || null,
      repairId: input.repairId ?? null,
      createdById: input.createdById,
    },
  });
  return { ok: true as const, item: result.item };
}

export async function sellPhoneByImei(input: {
  organizationId: string;
  createdById: string;
  imei: string;
  condition: MobileShopPhoneCondition;
  customerName: string;
  customerPhone: string;
  amountPaise: number;
}) {
  const phone = await findPhoneByImei(input.organizationId, input.imei.trim());
  if (!phone || phone.qty < 1) {
    return { ok: false as const, message: "No phone in stock with that IMEI." };
  }
  if (input.condition === "NEW" && phone.condition !== "NEW") {
    return { ok: false as const, message: "That IMEI is not a new phone." };
  }
  if (input.condition !== "NEW" && phone.condition === "NEW") {
    return { ok: false as const, message: "That IMEI is a new phone. Use New sale." };
  }
  return stockOut({
    organizationId: input.organizationId,
    createdById: input.createdById,
    itemId: phone.id,
    qty: 1,
    kind: "SALE",
    reason: input.condition === "NEW" ? "SALE" : "USED_SALE",
    amountPaise: input.amountPaise,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
  });
}

export async function listRepairs(organizationId: string) {
  return prisma.mobileShopRepair.findMany({
    where: { organizationId, status: { not: "CANCELLED" } },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: { parts: { include: { item: true } } },
  });
}

export async function getRepair(organizationId: string, repairId: string) {
  return prisma.mobileShopRepair.findFirst({
    where: { id: repairId, organizationId },
    include: { parts: { include: { item: true } } },
  });
}

export type AutoPartResult =
  | { used: true; name: string; message: string }
  | { used: false; message: string };

async function autoStockOutRepairPart(input: {
  organizationId: string;
  createdById: string;
  repairId: string;
  deviceName: string;
  jobType: string;
}): Promise<AutoPartResult> {
  const parts = await prisma.mobileShopItem.findMany({
    where: {
      organizationId: input.organizationId,
      kind: "PART",
      qty: { gt: 0 },
    },
  });
  const match = matchPartForRepair(parts, input.deviceName, input.jobType);
  if (!match) {
    return {
      used: false,
      message: "No matching part in stock — pick one on the job card.",
    };
  }
  const result = await stockOut({
    organizationId: input.organizationId,
    createdById: input.createdById,
    itemId: match.id,
    qty: 1,
    kind: "PART_TO_REPAIR",
    reason: "PART_USED",
    repairId: input.repairId,
  });
  if (!result.ok) {
    return { used: false, message: result.message };
  }
  return {
    used: true,
    name: match.name,
    message: `${match.name} stocked out.`,
  };
}

export async function createRepair(input: {
  organizationId: string;
  createdById: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  imei?: string;
  jobType: string;
  complaint?: string;
  promisedAt?: string | Date | null;
}) {
  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  const deviceName = input.deviceName.trim();
  if (!customerName || !customerPhone || !deviceName) {
    return { ok: false as const, message: "Customer, phone, and device are required." };
  }
  const promisedAt = parsePromisedAt(input.promisedAt);
  if (promisedAt === "invalid") {
    return { ok: false as const, message: "Promise date is invalid." };
  }
  const repair = await prisma.mobileShopRepair.create({
    data: {
      organizationId: input.organizationId,
      customerName,
      customerPhone,
      deviceName,
      imei: input.imei?.trim() || null,
      jobType: input.jobType.trim() || "Other",
      complaint: input.complaint?.trim() || null,
      promisedAt,
      createdById: input.createdById,
    },
  });
  const autoPart = await autoStockOutRepairPart({
    organizationId: input.organizationId,
    createdById: input.createdById,
    repairId: repair.id,
    deviceName: repair.deviceName,
    jobType: repair.jobType,
  });
  return { ok: true as const, repair, autoPart };
}

export async function advanceRepair(
  organizationId: string,
  repairId: string,
  status: MobileShopRepairStatus,
  createdById?: string,
) {
  const repair = await prisma.mobileShopRepair.findFirst({
    where: { id: repairId, organizationId },
    include: { parts: true },
  });
  if (!repair) return { ok: false as const, message: "Job not found." };
  const updated = await prisma.mobileShopRepair.update({
    where: { id: repair.id },
    data: { status },
  });
  let autoPart: AutoPartResult | null = null;
  if (status === "IN_PROGRESS" && repair.parts.length === 0 && createdById) {
    autoPart = await autoStockOutRepairPart({
      organizationId,
      createdById,
      repairId: repair.id,
      deviceName: repair.deviceName,
      jobType: repair.jobType,
    });
  }
  return { ok: true as const, repair: updated, autoPart };
}

export async function listRecentMovements(
  organizationId: string,
  take = 12,
  kind?: "in" | "out",
) {
  return prisma.mobileShopMovement.findMany({
    where: {
      organizationId,
      ...(kind === "in"
        ? { kind: "STOCK_IN" }
        : kind === "out"
          ? { kind: { in: ["SALE", "STOCK_OUT", "PART_TO_REPAIR"] } }
          : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    include: { item: true },
  });
}
