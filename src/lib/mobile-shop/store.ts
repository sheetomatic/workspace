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
  startOfShopDay,
  summarizeShopDay,
} from "@/lib/mobile-shop/day-glance";
import type { StockInLineInput } from "@/lib/mobile-shop/inbound";
import { uniquePhoneCatalog } from "@/lib/mobile-shop/phone-catalog";
import { isBelowMoq } from "@/lib/mobile-shop/moq";
import { notifyIfBelowMoq } from "@/lib/mobile-shop/moq-alerts";

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
      },
      orderBy: [{ qty: "asc" }, { name: "asc" }],
      take: 80,
      select: { id: true, name: true, kind: true, qty: true, moq: true },
    }),
  ]);

  const lowStockItems = stockItems
    .filter((item) => isBelowMoq(item.qty, item.moq, item.kind))
    .slice(0, 8);
  return summarizeShopDay({ now, movements, repairs, stockItems: lowStockItems });
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

export async function listUnsoldPhones(
  organizationId: string,
  saleType: "NEW" | "USED",
) {
  return prisma.mobileShopItem.findMany({
    where: {
      organizationId,
      kind: "PHONE",
      qty: { gt: 0 },
      ...(saleType === "NEW"
        ? { condition: "NEW" }
        : { NOT: { condition: "NEW" } }),
    },
    orderBy: [{ brand: "asc" }, { model: "asc" }, { name: "asc" }],
    take: 200,
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      color: true,
      imei: true,
      condition: true,
      qty: true,
    },
  });
}

export async function listQtyItemNames(
  organizationId: string,
  kind: "ACCESSORY" | "PART",
) {
  const items = await prisma.mobileShopItem.findMany({
    where: { organizationId, kind },
    select: { name: true },
    orderBy: { name: "asc" },
    take: 200,
  });
  const seen = new Set<string>();
  const names: string[] = [];
  for (const item of items) {
    const name = item.name.trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    names.push(name);
  }
  return names;
}

export async function mobileShopStockSummary(organizationId: string) {
  const [phones, accessories, qtyItems] = await Promise.all([
    prisma.mobileShopItem.count({
      where: { organizationId, kind: "PHONE", qty: { gt: 0 } },
    }),
    prisma.mobileShopItem.count({
      where: { organizationId, kind: "ACCESSORY", qty: { gt: 0 } },
    }),
    prisma.mobileShopItem.findMany({
      where: { organizationId, kind: { in: ["ACCESSORY", "PART"] } },
      select: { qty: true, moq: true, kind: true },
    }),
  ]);
  return {
    phones,
    accessories,
    belowMoq: qtyItems.filter((item) => isBelowMoq(item.qty, item.moq, item.kind)).length,
  };
}

export async function listStockDashboard(organizationId: string) {
  const items = await prisma.mobileShopItem.findMany({
    where: { organizationId },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  const phones = items.filter((item) => item.kind === "PHONE" && item.qty > 0).slice(0, 80);
  const accessories = items
    .filter((item) => item.kind === "ACCESSORY")
    .sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name));
  const parts = items.filter((item) => item.kind === "PART" && item.qty > 0).slice(0, 40);
  const belowMoq = items
    .filter((item) => isBelowMoq(item.qty, item.moq, item.kind))
    .sort((a, b) => a.qty - b.qty || a.name.localeCompare(b.name))
    .slice(0, 40);
  return {
    phones,
    accessories: accessories.filter((item) => item.qty > 0).slice(0, 80),
    parts,
    belowMoq,
    phoneCount: items.filter((item) => item.kind === "PHONE" && item.qty > 0).length,
    accessoryCount: accessories.filter((item) => item.qty > 0).length,
  };
}

export async function setItemMoq(
  organizationId: string,
  itemId: string,
  moq: number,
) {
  if (!Number.isFinite(moq) || moq < 0) {
    return { ok: false as const, message: "MOQ must be 0 or more." };
  }
  const item = await prisma.mobileShopItem.findFirst({
    where: { id: itemId, organizationId },
  });
  if (!item) return { ok: false as const, message: "Item not found." };
  const updated = await prisma.mobileShopItem.update({
    where: { id: item.id },
    data: { moq: Math.floor(moq) },
  });
  return { ok: true as const, item: updated };
}

export async function findPhoneByImei(organizationId: string, imei: string) {
  return prisma.mobileShopItem.findFirst({
    where: { organizationId, kind: "PHONE", imei },
  });
}

function phoneDisplayName(brand: string, model: string, color?: string | null) {
  return [brand.trim(), model.trim(), color?.trim()].filter(Boolean).join(" ").trim();
}

export async function listPhoneCatalog(organizationId: string) {
  const items = await prisma.mobileShopItem.findMany({
    where: { organizationId, kind: "PHONE" },
    select: { brand: true, model: true, color: true, condition: true, kind: true },
    orderBy: { updatedAt: "desc" },
    take: 400,
  });
  return uniquePhoneCatalog(items);
}

export async function stockInPhone(input: {
  organizationId: string;
  createdById: string;
  brand: string;
  model: string;
  color?: string;
  imei: string;
  condition: MobileShopPhoneCondition;
  reason?: string;
  notes?: string;
  inboundId?: string;
}) {
  const imei = input.imei.trim();
  if (!imei) return { ok: false as const, message: "IMEI is required for phones." };
  const existing = await findPhoneByImei(input.organizationId, imei);
  if (existing && existing.qty > 0) {
    return { ok: false as const, message: "This IMEI is already in stock." };
  }
  const brand = input.brand.trim();
  const model = input.model.trim();
  const color = input.color?.trim() || null;
  const name = phoneDisplayName(brand, model, color);
  const item = existing
    ? await prisma.mobileShopItem.update({
        where: { id: existing.id },
        data: { qty: 1, condition: input.condition, name, brand, model, color },
      })
    : await prisma.mobileShopItem.create({
        data: {
          organizationId: input.organizationId,
          kind: "PHONE",
          name,
          brand,
          model,
          color,
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
      inboundId: input.inboundId ?? null,
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
  moq?: number;
  reason?: string;
  notes?: string;
  inboundId?: string;
}) {
  if (input.qty <= 0) return { ok: false as const, message: "Qty must be more than 0." };
  const name = input.name.trim();
  if (!name) return { ok: false as const, message: "Name is required." };
  const moq =
    input.moq != null && Number.isFinite(input.moq) && input.moq >= 0
      ? Math.floor(input.moq)
      : undefined;
  let item = await prisma.mobileShopItem.findFirst({
    where: { organizationId: input.organizationId, kind: input.kind, name },
  });
  if (item) {
    item = await prisma.mobileShopItem.update({
      where: { id: item.id },
      data: { qty: item.qty + input.qty, ...(moq != null ? { moq } : {}) },
    });
  } else {
    item = await prisma.mobileShopItem.create({
      data: {
        organizationId: input.organizationId,
        kind: input.kind,
        name,
        qty: input.qty,
        moq: moq ?? 0,
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
      inboundId: input.inboundId ?? null,
      createdById: input.createdById,
    },
  });
  return { ok: true as const, item };
}

export async function stockInInvoice(input: {
  organizationId: string;
  createdById: string;
  invoiceNo: string;
  invoiceDate?: Date | null;
  supplier?: string;
  reason?: string;
  notes?: string;
  lines: StockInLineInput[];
}) {
  const invoiceNo = input.invoiceNo.trim();
  if (!invoiceNo) return { ok: false as const, message: "Invoice number is required." };
  if (input.lines.length === 0) {
    return { ok: false as const, message: "Add at least one line on this invoice." };
  }

  const phoneImeis = input.lines
    .filter((line): line is Extract<StockInLineInput, { kind: "PHONE" }> => line.kind === "PHONE")
    .map((line) => line.imei);
  if (phoneImeis.length > 0) {
    const alreadyIn = await prisma.mobileShopItem.findMany({
      where: {
        organizationId: input.organizationId,
        kind: "PHONE",
        imei: { in: phoneImeis },
        qty: { gt: 0 },
      },
      select: { imei: true },
    });
    if (alreadyIn[0]?.imei) {
      return { ok: false as const, message: `IMEI ${alreadyIn[0].imei} is already in stock.` };
    }
  }

  const reason = input.reason?.trim() || "PURCHASE";
  try {
    const inbound = await prisma.$transaction(async (tx) => {
      const header = await tx.mobileShopInbound.create({
        data: {
          organizationId: input.organizationId,
          invoiceNo,
          invoiceDate: input.invoiceDate ?? null,
          supplier: input.supplier?.trim() || null,
          notes: input.notes?.trim() || null,
          createdById: input.createdById,
        },
      });

      for (const line of input.lines) {
        let itemId: string;
        let qty: number;
        if (line.kind === "PHONE") {
          const existing = await tx.mobileShopItem.findFirst({
            where: {
              organizationId: input.organizationId,
              kind: "PHONE",
              imei: line.imei,
            },
          });
          if (existing && existing.qty > 0) {
            throw new Error(`IMEI ${line.imei} is already in stock.`);
          }
          const brand = line.brand.trim();
          const model = line.model.trim();
          const color = line.color.trim() || null;
          const name = phoneDisplayName(brand, model, color);
          const item = existing
            ? await tx.mobileShopItem.update({
                where: { id: existing.id },
                data: { qty: 1, condition: line.condition, name, brand, model, color },
              })
            : await tx.mobileShopItem.create({
                data: {
                  organizationId: input.organizationId,
                  kind: "PHONE",
                  name,
                  brand,
                  model,
                  color,
                  imei: line.imei,
                  condition: line.condition,
                  qty: 1,
                },
              });
          itemId = item.id;
          qty = 1;
        } else {
          if (line.qty <= 0) throw new Error("Qty must be more than 0.");
          const name = line.name.trim();
          const moq =
            line.moq != null && Number.isFinite(line.moq) && line.moq >= 0
              ? Math.floor(line.moq)
              : undefined;
          let item = await tx.mobileShopItem.findFirst({
            where: { organizationId: input.organizationId, kind: line.kind, name },
          });
          item = item
            ? await tx.mobileShopItem.update({
                where: { id: item.id },
                data: {
                  qty: item.qty + line.qty,
                  ...(moq != null ? { moq } : {}),
                },
              })
            : await tx.mobileShopItem.create({
                data: {
                  organizationId: input.organizationId,
                  kind: line.kind,
                  name,
                  qty: line.qty,
                  moq: moq ?? 0,
                },
              });
          itemId = item.id;
          qty = line.qty;
        }

        await tx.mobileShopMovement.create({
          data: {
            organizationId: input.organizationId,
            itemId,
            kind: "STOCK_IN",
            qty,
            reason,
            notes: input.notes?.trim() || null,
            inboundId: header.id,
            createdById: input.createdById,
          },
        });
        await tx.mobileShopInboundLine.create({
          data: { inboundId: header.id, itemId, qty },
        });
      }

      return tx.mobileShopInbound.findFirstOrThrow({
        where: { id: header.id, organizationId: input.organizationId },
        include: { lines: { include: { item: true } } },
      });
    });
    return { ok: true as const, inbound };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save invoice.";
    return { ok: false as const, message };
  }
}

export async function listRecentInbounds(organizationId: string, take = 12) {
  return prisma.mobileShopInbound.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take,
    include: { lines: { include: { item: true }, orderBy: { createdAt: "asc" } } },
  });
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
  void notifyIfBelowMoq({
    organizationId: input.organizationId,
    qtyBefore: result.item.qty + input.qty,
    item: result.item,
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
