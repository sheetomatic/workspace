"use server";

import { revalidatePath } from "next/cache";
import type { MobileShopPhoneCondition, MobileShopRepairStatus } from "@prisma/client";
import { parseRupeesInput } from "@/lib/billing/money";
import { getMobileShopAccess } from "@/lib/mobile-shop/access";
import { requireSession } from "@/lib/require-session";
import {
  isStockInReason,
  movementKindForOutReason,
} from "@/lib/mobile-shop/reasons";
import { parsePromisedAt } from "@/lib/mobile-shop/promised-at";
import { parseInboundLines } from "@/lib/mobile-shop/inbound";
import {
  advanceRepair,
  createRepair,
  sellPhoneByImei,
  stockInInvoice,
  stockInPhone,
  stockInQtyItem,
  stockOut,
} from "@/lib/mobile-shop/store";

export type ShopActionResult = { ok: boolean; message: string };

async function requireShopUser() {
  const user = await requireSession();
  const access = await getMobileShopAccess(user);
  if (!access.allowed) {
    return { ok: false as const, message: "Mobile shop license is not active." };
  }
  return { ok: true as const, user };
}

function refreshShop() {
  revalidatePath("/app/mobile-shop");
  revalidatePath("/app/mobile-shop/stock");
  revalidatePath("/app/mobile-shop/used-in");
  revalidatePath("/app/mobile-shop/repairs");
  revalidatePath("/app/mobile-shop/accessories");
  revalidatePath("/app/mobile-shop/stock-in");
  revalidatePath("/app/mobile-shop/stock-out");
  revalidatePath("/app/mobile-shop/sales");
}

export async function stockInAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const kind = String(formData.get("kind") ?? "");
  const reasonRaw = String(formData.get("reason") ?? "PURCHASE");
  const reason = isStockInReason(reasonRaw) ? reasonRaw : "PURCHASE";
  if (kind === "PHONE") {
    const condition = String(formData.get("condition") ?? "NEW") as MobileShopPhoneCondition;
    const result = await stockInPhone({
      organizationId: gate.user.organizationId,
      createdById: gate.user.id,
      brand: String(formData.get("brand") ?? ""),
      model: String(formData.get("model") ?? ""),
      color: String(formData.get("color") ?? ""),
      imei: String(formData.get("imei") ?? ""),
      condition:
        condition === "USED" || condition === "REFURBISHED" ? condition : "NEW",
      reason,
      notes: String(formData.get("notes") ?? ""),
    });
    if (!result.ok) return result;
    refreshShop();
    return { ok: true, message: "Phone in stock." };
  }
  const qty = Number.parseInt(String(formData.get("qty") ?? "0"), 10);
  const result = await stockInQtyItem({
    organizationId: gate.user.organizationId,
    createdById: gate.user.id,
    kind: kind === "PART" ? "PART" : "ACCESSORY",
    name: String(formData.get("name") ?? ""),
    qty: Number.isFinite(qty) ? qty : 0,
    reason,
    notes: String(formData.get("notes") ?? ""),
  });
  if (!result.ok) return result;
  refreshShop();
  return { ok: true, message: "Stock in recorded." };
}

export async function stockInInvoiceAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const parsed = parseInboundLines(String(formData.get("lines") ?? "[]"));
  if (!parsed.ok) return parsed;
  const invoiceDate = parsePromisedAt(String(formData.get("invoiceDate") ?? ""));
  if (invoiceDate === "invalid") {
    return { ok: false, message: "Invoice date is invalid." };
  }
  const reasonRaw = String(formData.get("reason") ?? "PURCHASE");
  const reason = isStockInReason(reasonRaw) ? reasonRaw : "PURCHASE";
  const result = await stockInInvoice({
    organizationId: gate.user.organizationId,
    createdById: gate.user.id,
    invoiceNo: String(formData.get("invoiceNo") ?? ""),
    invoiceDate,
    supplier: String(formData.get("supplier") ?? ""),
    reason,
    notes: String(formData.get("notes") ?? ""),
    lines: parsed.lines,
  });
  if (!result.ok) return result;
  refreshShop();
  return {
    ok: true,
    message: `Invoice ${result.inbound.invoiceNo} in · ${result.inbound.lines.length} line${
      result.inbound.lines.length === 1 ? "" : "s"
    }.`,
  };
}

export async function stockOutAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const qty = Number.parseInt(String(formData.get("qty") ?? "1"), 10);
  const reason = String(formData.get("reason") ?? "RETURN_TO_SUPPLIER");
  const result = await stockOut({
    organizationId: gate.user.organizationId,
    createdById: gate.user.id,
    itemId: String(formData.get("itemId") ?? ""),
    qty: Number.isFinite(qty) ? qty : 0,
    kind: movementKindForOutReason(reason),
    reason,
    notes: String(formData.get("notes") ?? ""),
  });
  if (!result.ok) return result;
  refreshShop();
  return { ok: true, message: "Stock out recorded." };
}

export async function sellAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const mode = String(formData.get("mode") ?? "");
  const amountPaise = parseRupeesInput(String(formData.get("amount") ?? "0")) ?? 0;
  if (mode === "PHONE") {
    const saleType = String(formData.get("saleType") ?? "NEW");
    const result = await sellPhoneByImei({
      organizationId: gate.user.organizationId,
      createdById: gate.user.id,
      imei: String(formData.get("imei") ?? ""),
      condition: saleType === "USED" ? "USED" : "NEW",
      customerName: String(formData.get("customerName") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      amountPaise,
    });
    if (!result.ok) return result;
    refreshShop();
    return { ok: true, message: "Sale recorded." };
  }
  const qty = Number.parseInt(String(formData.get("qty") ?? "1"), 10);
  const result = await stockOut({
    organizationId: gate.user.organizationId,
    createdById: gate.user.id,
    itemId: String(formData.get("itemId") ?? ""),
    qty: Number.isFinite(qty) ? qty : 0,
    kind: "SALE",
    reason: "ACCESSORY_SALE",
    amountPaise,
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
  });
  if (!result.ok) return result;
  refreshShop();
  return { ok: true, message: "Accessory sold." };
}

export async function createRepairAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const result = await createRepair({
    organizationId: gate.user.organizationId,
    createdById: gate.user.id,
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    deviceName: String(formData.get("deviceName") ?? ""),
    imei: String(formData.get("imei") ?? ""),
    jobType: String(formData.get("jobType") ?? "Other"),
    complaint: String(formData.get("complaint") ?? ""),
    promisedAt: String(formData.get("promisedAt") ?? ""),
  });
  if (!result.ok) return result;
  refreshShop();
  revalidatePath(`/app/mobile-shop/repairs/${result.repair.id}`);
  return { ok: true, message: `Job opened. ${result.autoPart.message}` };
}

export async function advanceRepairAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const status = String(formData.get("status") ?? "") as MobileShopRepairStatus;
  const allowed: MobileShopRepairStatus[] = [
    "RECEIVED",
    "IN_PROGRESS",
    "READY",
    "DELIVERED",
    "CANCELLED",
  ];
  if (!allowed.includes(status)) {
    return { ok: false, message: "Unknown status." };
  }
  const result = await advanceRepair(
    gate.user.organizationId,
    String(formData.get("repairId") ?? ""),
    status,
    gate.user.id,
  );
  if (!result.ok) return result;
  refreshShop();
  revalidatePath(`/app/mobile-shop/repairs/${result.repair.id}`);
  const marked = `Job marked ${status.replace("_", " ").toLowerCase()}.`;
  if (result.autoPart) {
    return { ok: true, message: `${marked} ${result.autoPart.message}` };
  }
  return { ok: true, message: marked };
}

export async function repairPartOutAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const qty = Number.parseInt(String(formData.get("qty") ?? "1"), 10);
  const result = await stockOut({
    organizationId: gate.user.organizationId,
    createdById: gate.user.id,
    itemId: String(formData.get("itemId") ?? ""),
    qty: Number.isFinite(qty) ? qty : 0,
    kind: "PART_TO_REPAIR",
    reason: "PART_USED",
    repairId: String(formData.get("repairId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!result.ok) return result;
  refreshShop();
  revalidatePath(`/app/mobile-shop/repairs/${String(formData.get("repairId") ?? "")}`);
  return { ok: true, message: "Part stocked out to this job." };
}
