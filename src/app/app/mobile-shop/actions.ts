"use server";

import { revalidatePath } from "next/cache";
import type { MobileShopPhoneCondition, MobileShopRepairStatus } from "@prisma/client";
import { requireSession } from "@/lib/require-session";
import { parseRupeesInput } from "@/lib/billing/money";
import { MOBILE_SHOP_KIT_KEY } from "@/lib/addons/licensed-kits";
import { orgHasActiveKitLicense } from "@/lib/addons/kit-license";
import {
  advanceRepair,
  createRepair,
  sellPhoneByImei,
  stockInPhone,
  stockInQtyItem,
  stockOut,
} from "@/lib/mobile-shop/store";

export type ShopActionResult = { ok: boolean; message: string };

async function requireShopUser() {
  const user = await requireSession();
  const licensed = await orgHasActiveKitLicense(
    user.organizationId,
    MOBILE_SHOP_KIT_KEY,
  );
  if (!licensed) {
    return { ok: false as const, message: "Mobile shop license is not active." };
  }
  return { ok: true as const, user };
}

function refreshShop() {
  revalidatePath("/app/mobile-shop");
  revalidatePath("/app/mobile-shop/stock");
  revalidatePath("/app/mobile-shop/repairs");
  revalidatePath("/app/mobile-shop/accessories");
  revalidatePath("/app/mobile-shop/sales");
}

export async function stockInAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const kind = String(formData.get("kind") ?? "");
  if (kind === "PHONE") {
    const condition = String(formData.get("condition") ?? "NEW") as MobileShopPhoneCondition;
    const result = await stockInPhone({
      organizationId: gate.user.organizationId,
      createdById: gate.user.id,
      brand: String(formData.get("brand") ?? ""),
      model: String(formData.get("model") ?? ""),
      imei: String(formData.get("imei") ?? ""),
      condition:
        condition === "USED" || condition === "REFURBISHED" ? condition : "NEW",
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
    notes: String(formData.get("notes") ?? ""),
  });
  if (!result.ok) return result;
  refreshShop();
  return { ok: true, message: "Stock in recorded." };
}

export async function stockOutAction(formData: FormData): Promise<ShopActionResult> {
  const gate = await requireShopUser();
  if (!gate.ok) return gate;
  const qty = Number.parseInt(String(formData.get("qty") ?? "1"), 10);
  const result = await stockOut({
    organizationId: gate.user.organizationId,
    createdById: gate.user.id,
    itemId: String(formData.get("itemId") ?? ""),
    qty: Number.isFinite(qty) ? qty : 0,
    kind: "STOCK_OUT",
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
  });
  if (!result.ok) return result;
  refreshShop();
  revalidatePath(`/app/mobile-shop/repairs/${result.repair.id}`);
  return { ok: true, message: "Job card opened." };
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
  );
  if (!result.ok) return result;
  refreshShop();
  revalidatePath(`/app/mobile-shop/repairs/${result.repair.id}`);
  return { ok: true, message: `Job marked ${status.replace("_", " ").toLowerCase()}.` };
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
    repairId: String(formData.get("repairId") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });
  if (!result.ok) return result;
  refreshShop();
  revalidatePath(`/app/mobile-shop/repairs/${String(formData.get("repairId") ?? "")}`);
  return { ok: true, message: "Part stocked out to this job." };
}
