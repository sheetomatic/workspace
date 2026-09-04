import "server-only";

import type {
  MobileShopItemKind,
  MobileShopMovementKind,
  MobileShopPhoneCondition,
  MobileShopRepairStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { startOfUtcDay } from "@/lib/billing/dates";

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
  const dayStart = startOfUtcDay(now);
  const [
    phonesInStock,
    accessoryLines,
    stockInToday,
    soldToday,
    repairsOpen,
    repairsReady,
    accessorySoldQty,
  ] = await Promise.all([
    prisma.mobileShopItem.count({
      where: { organizationId, kind: "PHONE", qty: { gt: 0 } },
    }),
    prisma.mobileShopItem.count({
      where: { organizationId, kind: "ACCESSORY", qty: { gt: 0 } },
    }),
    prisma.mobileShopMovement.count({
      where: { organizationId, kind: "STOCK_IN", createdAt: { gte: dayStart } },
    }),
    prisma.mobileShopMovement.count({
      where: {
        organizationId,
        kind: { in: ["SALE", "STOCK_OUT"] },
        createdAt: { gte: dayStart },
      },
    }),
    prisma.mobileShopRepair.count({
      where: {
        organizationId,
        status: { in: ["RECEIVED", "IN_PROGRESS"] },
      },
    }),
    prisma.mobileShopRepair.count({
      where: { organizationId, status: "READY" },
    }),
    prisma.mobileShopMovement.aggregate({
      where: {
        organizationId,
        kind: "SALE",
        item: { kind: "ACCESSORY" },
        createdAt: { gte: dayStart },
      },
      _sum: { qty: true },
    }),
  ]);

  return {
    phonesInStock,
    accessoryLines,
    stockInToday,
    soldToday,
    repairsOpen,
    repairsReady,
    accessorySoldQty: accessorySoldQty._sum.qty ?? 0,
  };
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

export async function createRepair(input: {
  organizationId: string;
  createdById: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  imei?: string;
  jobType: string;
  complaint?: string;
}) {
  const customerName = input.customerName.trim();
  const customerPhone = input.customerPhone.trim();
  const deviceName = input.deviceName.trim();
  if (!customerName || !customerPhone || !deviceName) {
    return { ok: false as const, message: "Customer, phone, and device are required." };
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
      createdById: input.createdById,
    },
  });
  return { ok: true as const, repair };
}

export async function advanceRepair(
  organizationId: string,
  repairId: string,
  status: MobileShopRepairStatus,
) {
  const repair = await prisma.mobileShopRepair.findFirst({
    where: { id: repairId, organizationId },
  });
  if (!repair) return { ok: false as const, message: "Job not found." };
  const updated = await prisma.mobileShopRepair.update({
    where: { id: repair.id },
    data: { status },
  });
  return { ok: true as const, repair: updated };
}
